import {
  Keypair,
  Connection,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  Metadata,
  ParsedAccount,
  MasterEditionV1,
  MasterEditionV2,
  SequenceType,
  sendTransactions,
  getSafetyDepositBox,
  Edition,
  getEdition,
  programIds,
  Creator,
  sendTransactionWithRetry,
  ICreateFractionArgs,
  StringPublicKey,
  WalletSigner,
  FractionWinningConfigType,
  FractionSafetyDepositConfig,
  getFractionManagerKey,
  getWhitelistedCreator,
  WhitelistedCreator,
  initFractionManager,
  FrackHouseIndexer,
  WhitelistedFracker,
  WhitelistedFrackerParser,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import BN from 'bn.js';
import { createVault } from './createVault';
import { addTokensToVault } from './addTokensToVault';
import { FractionSafetyDepositInstructionTemplate } from './activateFractionVault';
import { createExternalPriceAccount } from './createExternalPriceAccount';
import { setVaultFractionAuthorities } from './setVaultFractionAuthorities';
import { markItemsThatArentMineAsSold } from './markItemsThatArentMineAsSold';
import { validateFractionSafetyDepositBox } from '@oyster/common/dist/lib/models/frantik/validateFractionSafetyDepositBox';
import { activateFractionVault } from '../actions/activateFractionVault';
import { cacheVaultIndexer } from './cacheVaultInIndexer';
import Fracker from '@oyster/common';
interface normalPattern {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

interface arrayPattern {
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}

interface byType {
  markItemsThatArentMineAsSold: arrayPattern;
  addTokens: arrayPattern;
  validateBoxes: arrayPattern;
  createVault: normalPattern;
  activateVault: normalPattern;
  initFractionManager: normalPattern;
  setVaultFractionAuthorities: normalPattern;
  externalFractionPriceAccount: normalPattern;
  cacheVaultIndexer: arrayPattern;
}

export interface FractionSafetyDepositDraft {
  metadata: ParsedAccount<Metadata>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
  edition?: ParsedAccount<Edition>;
  holding: StringPublicKey;
  fractionWinningConfigType: FractionWinningConfigType;
}

// This is a super command that executes many transactions to create a Vault and FractionManager starting
// from some FractionManagerSettings.
export async function createFractionManager(
  connection: Connection,
  wallet: WalletSigner,
  fractionVaultSettings: ICreateFractionArgs,
  safetyDepositDrafts: FractionSafetyDepositDraft[],
  paymentMint: StringPublicKey,
  frackHouseIndexer: ParsedAccount<FrackHouseIndexer>[],
): Promise<{
  vault: StringPublicKey;
  fractionManager: StringPublicKey;
  fractionalMint: StringPublicKey;
}> {
  const {
    externalPriceAccount,
    instructions: epaInstructions,
    signers: epaSigners,
  } = await createExternalPriceAccount(
    connection,
    wallet,
    fractionVaultSettings.maxSupply,
    fractionVaultSettings.buyoutPrice,
    paymentMint,
  );

  const {
    instructions: createVaultInstructions,
    signers: createVaultSigners,
    vault,
    fractionalMint,
    //redeemTreasury,
    fractionTreasury,
  } = await createVault(connection, wallet, paymentMint, externalPriceAccount);

  const safetyDepositConfigs = await buildSafetyDepositArray(
    wallet,
    safetyDepositDrafts,
  );

  const {
    instructions: addTokenInstructions,
    signers: addTokenSigners,
    safetyDepositTokenStores,
  } = await addTokensToVault(connection, wallet, vault, safetyDepositConfigs);

  const {
    instructions: activateVaultInstructions,
    signers: activateVaultSigners,
  } = await activateFractionVault(
    wallet,
    vault,
    fractionVaultSettings.maxSupply,
    fractionalMint,
    fractionTreasury,
  );

  const {
    instructions: fractionManagerInstructions,
    signers: fractionManagerSigners,
    fractionManager,
  } = await setupFractionManagerInstructions(
    wallet,
    vault,
    paymentMint,
    fractionalMint,
    externalPriceAccount,
  );

  const lookup: byType = {
    markItemsThatArentMineAsSold: await markItemsThatArentMineAsSold(
      wallet,
      safetyDepositDrafts,
    ),
    externalFractionPriceAccount: {
      instructions: epaInstructions,
      signers: epaSigners,
    },
    createVault: {
      instructions: createVaultInstructions,
      signers: createVaultSigners,
    },
    addTokens: { instructions: addTokenInstructions, signers: addTokenSigners },
    activateVault: {
      instructions: activateVaultInstructions,
      signers: activateVaultSigners,
    },
    initFractionManager: {
      instructions: fractionManagerInstructions,
      signers: fractionManagerSigners,
    },
    setVaultFractionAuthorities: await setVaultFractionAuthorities(
      wallet,
      vault,
      fractionManager,
    ),
    validateBoxes: await validateBoxes(
      wallet,
      vault,
      safetyDepositConfigs,
      safetyDepositTokenStores,
      fractionalMint,
    ),
    cacheVaultIndexer: await cacheVaultIndexer(
      wallet,
      vault,
      fractionManager,
      safetyDepositConfigs.map(s => s.draft.metadata.info.mint),
      frackHouseIndexer,
    ),
  };

  const signers: Keypair[][] = [
    ...lookup.markItemsThatArentMineAsSold.signers,
    lookup.externalFractionPriceAccount.signers,
    lookup.createVault.signers,
    ...lookup.addTokens.signers,
    lookup.activateVault.signers,
    lookup.initFractionManager.signers,
    lookup.setVaultFractionAuthorities.signers,
    ...lookup.validateBoxes.signers,
    ...lookup.cacheVaultIndexer.signers,
  ];

  // TODO - REMOVE DEBUG
  for (let i = 0; i < signers.length; i++) {
    console.log(
      'for i = ' + i + '    length of signers is ' + signers[i].length,
    );
  }

  const toRemoveSigners: Record<number, boolean> = {};
  let instructions: TransactionInstruction[][] = [
    ...lookup.markItemsThatArentMineAsSold.instructions,
    lookup.externalFractionPriceAccount.instructions,
    lookup.createVault.instructions,
    ...lookup.addTokens.instructions,
    lookup.activateVault.instructions,
    lookup.initFractionManager.instructions,
    lookup.setVaultFractionAuthorities.instructions,
    ...lookup.validateBoxes.instructions,
    ...lookup.cacheVaultIndexer.instructions,
  ].filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });

  let filteredSigners = signers.filter((_, i) => !toRemoveSigners[i]);

  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength: number | null = null;
  while (stopPoint < instructions.length && tries < 3) {
    instructions = instructions.slice(stopPoint, instructions.length);
    filteredSigners = filteredSigners.slice(stopPoint, filteredSigners.length);

    if (instructions.length === lastInstructionsLength) tries = tries + 1;
    else tries = 0;

    try {
      if (instructions.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructions[0],
          filteredSigners[0],
          'single',
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructions,
          filteredSigners,
          SequenceType.StopOnFailure,
          'single',
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructions[stopPoint],
      'instructions length is',
      instructions.length,
    );
    lastInstructionsLength = instructions.length;
  }

  if (stopPoint < instructions.length) throw new Error('Failed to create');

  // todo - debug
  console.log('Finished. vault: ' + vault);
  console.log('Finished. fractionalTreasury: ' + fractionTreasury);
  console.log('Finished. fractionalMint: ' + fractionalMint);

  // TODO - are these the right things returned?
  return { vault, fractionManager, fractionalMint };

  // TODO - dont think needed maybe?
  // IMPORTANT
  // So, after activating the vault,
  // fractionalMint is the address who can mint new
  // const outstandingShareAccount = createTokenAccount(
  //   instructions,
  //   wallet.publicKey,
  //   accountRentExempt,
  //   toPublicKey(fractionalMint),
  //   wallet.publicKey,
  //   signers,
  // );

  // const payingTokenAccount = createTokenAccount(
  //   instructions,
  //   wallet.publicKey,
  //   accountRentExempt,
  //   toPublicKey(priceMint),
  //   wallet.publicKey,
  //   signers,
  // );
}

async function buildSafetyDepositArray(
  wallet: WalletSigner,
  safetyDeposits: FractionSafetyDepositDraft[],
): Promise<FractionSafetyDepositInstructionTemplate[]> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const safetyDepositTemplates: FractionSafetyDepositInstructionTemplate[] = [];
  safetyDeposits.forEach((s, i) => {
    safetyDepositTemplates.push({
      box: {
        tokenAccount: s.holding,
        tokenMint: s.metadata.info.mint,
        amount: new BN(1),
      },
      config: new FractionSafetyDepositConfig({
        directArgs: {
          fractionManager: SystemProgram.programId.toBase58(),
          order: new BN(i),
          fractionWinningConfigType: s.fractionWinningConfigType,
        },
      }),
      draft: s,
    });
  });

  console.log('Temps', safetyDepositTemplates);
  return safetyDepositTemplates;
}

async function setupFractionManagerInstructions(
  wallet: WalletSigner,
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
  fractionMint: StringPublicKey,
  externalPriceAccount: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
  fractionManager: StringPublicKey;
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const fractionManagerKey = await getFractionManagerKey(vault, tokenMint);

  await initFractionManager(
    fractionManagerKey,
    vault,
    tokenMint,
    fractionMint,
    externalPriceAccount,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    store,
    instructions,
  );

  return { instructions, signers, fractionManager: fractionManagerKey };
}

async function isValidWhitelistedFracker(
  whitelistedFrackersByFracker: Record<
    string,
    ParsedAccount<WhitelistedFracker>
  >,
  walletPubKey: StringPublicKey,
): Promise<boolean> {

  if (whitelistedFrackersByFracker[walletPubKey]?.info.activated) {
    return true;
  }
  return false;
}

export async function validateBoxes(
  wallet: WalletSigner,
  vault: StringPublicKey,
  safetyDeposits: FractionSafetyDepositInstructionTemplate[],
  safetyDepositTokenStores: StringPublicKey[],
  fractionMint: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];

  for (let i = 0; i < safetyDeposits.length; i++) {
    const tokenSigners: Keypair[] = [];
    const tokenInstructions: TransactionInstruction[] = [];

    const safetyDepositBox = await getSafetyDepositBox(
      vault,
      safetyDeposits[i].draft.metadata.info.mint,
    );

    const edition: StringPublicKey = await getEdition(
      safetyDeposits[i].draft.metadata.info.mint,
    );

    await validateFractionSafetyDepositBox(
      vault,
      safetyDeposits[i].draft.metadata.pubkey,
      safetyDepositBox,
      safetyDepositTokenStores[i],
      safetyDeposits[i].draft.metadata.info.mint,
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      tokenInstructions,
      edition,
      wallet.publicKey.toBase58(),
      store,
      safetyDeposits[i].config,
      fractionMint,
    );

    signers.push(tokenSigners);
    instructions.push(tokenInstructions);
  }
  return { instructions, signers };
}
