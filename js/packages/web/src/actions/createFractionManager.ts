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
  IPartialCreateFractionArgs,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  getFractionManagerKey,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';
import {
  FractionWinningConfigType,
  getWhitelistedCreator,
  WhitelistedCreator,
  FractionSafetyDepositConfig,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { createTokenAccount } from '@oyster/common/dist/lib/actions/account';
import { createVault } from './createVault';
import {
  addTokensToVault,
} from './addTokensToVault';
import { FractionSafetyDepositInstructionTemplate } from './activateFractionVault';
import { createExternalFractionPriceAccount } from './createExternalFractionPriceAccount';
import { setVaultFractionAuthorities } from './setVaultFractionAuthorities';
import { markItemsThatArentMineAsSold } from './markItemsThatArentMineAsSold';
import { validateFractionSafetyDepositBox } from '@oyster/common/dist/lib/models/metaplex/validateFractionSafetyDepositBox';
import { initFractionManager } from '@oyster/common/dist/lib/models/metaplex/initFractionManager';
import { activateFractionVault } from '../actions/activateFractionVault';

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
  // TODO :)
  //cacheFractionIndexer: arrayPattern;
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
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  fractionVaultSettings: IPartialCreateFractionArgs,
  safetyDepositDrafts: FractionSafetyDepositDraft[],
  paymentMint: StringPublicKey,
  marketPoolSize: BN,
  //storeIndexer: ParsedAccount<StoreIndexer>[], // TODO 
): Promise<{
  vault: StringPublicKey;
  fractionManager: StringPublicKey;
  fractionalMint: StringPublicKey;
}> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  
  const {
    externalPriceAccount,
    priceMint,
    instructions: epaInstructions,
    signers: epaSigners,
  } = await createExternalFractionPriceAccount(connection, wallet, fractionVaultSettings.maxSupply, fractionVaultSettings.buyoutPrice);
  
  const {
    instructions: createVaultInstructions,
    signers: createVaultSigners,
    vault,
    fractionalMint,
    //redeemTreasury,
    fractionTreasury,
  } = await createVault(connection, wallet, priceMint, externalPriceAccount);

  const safetyDepositConfigs =
    await buildSafetyDepositArray(
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
  } = 
  await activateFractionVault(
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
    accountRentExempt,
    safetyDepositConfigs,
    fractionalMint,
    externalPriceAccount,
    marketPoolSize,
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
    activateVault: { instructions: activateVaultInstructions, signers: activateVaultSigners },
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
      whitelistedCreatorsByCreator,
      vault,
      safetyDepositConfigs,
      safetyDepositTokenStores,
      fractionalMint,
    ),
    // TODO - sort out indexer for fractions
    // cacheAuctionIndexer: await cacheAuctionIndexer(
    //   wallet,
    //   vault,
    //   auction,
    //   auctionManager,
    //   safetyDepositConfigs.map(s => s.draft.metadata.info.mint),
    //   storeIndexer,
    // ),
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
    //TODO - ...lookup.cacheFractionIndexer.signers,
  ];

  // TODO - REMOVE DEBUG
  for(var i=0; i < signers.length; i++) {
    console.log("for i = " + i + "    length of signers is " + signers[i].length);
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
    // TODO - ^^^^ ...lookup.cacheFractionIndexer.instructions,
  ].filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });

  // TODO - REMOVE debug
  for(var i=0; i < instructions.length; i++) {
    console.log("for i = " + i + "    length of instructions is " + instructions[i].length);
  }

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
  console.log("Finished. vault: " + vault);
  console.log("Finished. fractionalTreasury: " + fractionTreasury);
  console.log("Finished. fractionalMint: " + fractionalMint);

  // TODO - are these the right things returned?
  return { vault, fractionManager, fractionalMint};

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
  console.log("OMG LOOK HERE!!!!!")
  safetyDeposits.forEach((s, i ) => {
    console.log("sfaety are " + JSON.stringify(s) + "anddddD" + i);
  })
  const safetyDepositTemplates: FractionSafetyDepositInstructionTemplate[] = [];
  safetyDeposits.forEach((s, i) => {
    safetyDepositTemplates.push({
      box: {
        tokenAccount: s.holding,
        tokenMint: s.metadata.info.mint,
        amount: new BN(1)
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
  paymentMint: StringPublicKey,
  accountRentExempt: number,
  safetyDeposits: FractionSafetyDepositInstructionTemplate[],
  tokenMint: StringPublicKey,
  externalPriceAccount: StringPublicKey,
  marketPoolSize: BN
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
  console.log("fractionManagerKey found as: " + fractionManagerKey);

  const acceptPayment = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(paymentMint),
    toPublicKey(fractionManagerKey),
    signers,
  ).toBase58();

  // let maxRanges = [
  //   safetyDeposits.length,
  //   100,
  // ].sort()[0];
  // if (maxRanges < 10) {
  //   maxRanges = 10;
  // }

  await initFractionManager(
    fractionManagerKey,
    vault,
    tokenMint,
    externalPriceAccount,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    acceptPayment,
    store,
    marketPoolSize,
    instructions,
  );
  console.log("instructions!!! are ----> " + instructions);

  return { instructions, signers, fractionManager: fractionManagerKey };
}


async function findValidWhitelistedCreator(
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  creators: Creator[],
): Promise<StringPublicKey> {
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];

    if (whitelistedCreatorsByCreator[creator.address]?.info.activated)
      return whitelistedCreatorsByCreator[creator.address].pubkey;
  }
  return await getWhitelistedCreator(creators[0]?.address);
}

export async function validateBoxes(
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
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

    const whitelistedCreator = safetyDeposits[i].draft.metadata.info.data
      .creators
      ? await findValidWhitelistedCreator(
          whitelistedCreatorsByCreator,
          //@ts-ignore
          safetyDeposits[i].draft.metadata.info.data.creators,
        )
      : undefined;

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
      whitelistedCreator,
      store,
      safetyDeposits[i].config,
      fractionMint,
    );

    signers.push(tokenSigners);
    instructions.push(tokenInstructions);
  }
  return { instructions, signers };
}

