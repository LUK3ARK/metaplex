import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { ParsedAccount, StringPublicKey, WalletSigner } from '@oyster/common';
import { getSafetyDepositBoxAddress } from '@oyster/common/dist/lib/actions/vault';
import {
  FrackHouseIndexer,
  getFrackHouseIndexer,
  getVaultCache,
} from '@oyster/common/dist/lib/models/frantik/index';
import { MAX_INDEXED_ELEMENTS } from '@oyster/common';
import { setFrackHouseIndex } from '@oyster/common/dist/lib/models/frantik/setFrackHouseIndex';
import { setVaultCache } from '@oyster/common/dist/lib/models/frantik/setVaultCache';
import BN from 'bn.js';

// This command caches an vault at position 0, page 0, and moves everything up
export async function cacheVaultIndexer(
  wallet: WalletSigner,
  vault: StringPublicKey,
  fractionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
  frackHouseIndexer: ParsedAccount<FrackHouseIndexer>[],
  skipCache?: boolean,
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();
  const payer = wallet.publicKey.toBase58();

  const instructions: TransactionInstruction[] = [];

  const {
    vaultCache,
    instructions: createAuctionCacheInstructions,
    signers: createAuctionCacheSigners,
  } = await createVaultCache(
    wallet,
    vault,
    fractionManager,
    tokenMints,
  );

  const above =
    frackHouseIndexer.length == 0
      ? undefined
      : frackHouseIndexer[0].info.vaultCaches[0];

  const frackHouseIndexKey = await getFrackHouseIndexer(0);
  await setFrackHouseIndex(
    frackHouseIndexKey,
    vaultCache,
    payer,
    new BN(0),
    new BN(0),
    instructions,
    undefined,
    above,
  );

  const { instructions: propagationInstructions, signers: propagationSigners } =
    await propagateIndex(wallet, frackHouseIndexer);

  return {
    instructions: [
      ...(skipCache ? [] : createAuctionCacheInstructions),
      instructions,
      ...propagationInstructions,
    ],
    signers: [
      ...(skipCache ? [] : createAuctionCacheSigners),
      [],
      ...propagationSigners,
    ],
  };
}

const INDEX_TRANSACTION_SIZE = 10;
async function propagateIndex(
  wallet: WalletSigner,
  frackHouseIndexer: ParsedAccount<FrackHouseIndexer>[],
): Promise<{ instructions: TransactionInstruction[][]; signers: Keypair[][] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currSignerBatch: Array<Keypair[]> = [];
  const currInstrBatch: Array<TransactionInstruction[]> = [];

  let indexSigners: Keypair[] = [];
  let indexInstructions: TransactionInstruction[] = [];

  let currPage: ParsedAccount<FrackHouseIndexer> | null = frackHouseIndexer[0];
  let lastPage: ParsedAccount<FrackHouseIndexer> | null = null;
  while (
    currPage &&
    currPage.info.vaultCaches.length == MAX_INDEXED_ELEMENTS
  ) {
    const cacheLeavingThePage =
      currPage.info.vaultCaches[currPage.info.vaultCaches.length - 1];
    const nextPage = frackHouseIndexer[currPage.info.page.toNumber() + 1];
    if (nextPage) {
      lastPage = currPage;
      currPage = nextPage;
    } else {
      lastPage = currPage;
      currPage = null;
    }

    const storeIndexKey = currPage
      ? currPage.pubkey
      : await getFrackHouseIndexer(lastPage.info.page.toNumber() + 1);
    const above = currPage ? currPage.info.vaultCaches[0] : undefined;

    await setFrackHouseIndex(
      storeIndexKey,
      cacheLeavingThePage,
      payer,
      lastPage.info.page.add(new BN(1)),
      new BN(0),
      indexInstructions,
      undefined,
      above,
    );

    if (indexInstructions.length >= INDEX_TRANSACTION_SIZE) {
      currSignerBatch.push(indexSigners);
      currInstrBatch.push(indexInstructions);
      indexSigners = [];
      indexInstructions = [];
    }
  }

  if (
    indexInstructions.length < INDEX_TRANSACTION_SIZE &&
    indexInstructions.length > 0
  ) {
    currSignerBatch.push(indexSigners);
    currInstrBatch.push(indexInstructions);
  }

  return {
    instructions: currInstrBatch,
    signers: currSignerBatch,
  };
}

const TRANSACTION_SIZE = 10;

async function createVaultCache(
  wallet: WalletSigner,
  vault: StringPublicKey,
  fractionManager: StringPublicKey,
  tokenMints: StringPublicKey[],
): Promise<{
  vaultCache: StringPublicKey;
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const payer = wallet.publicKey.toBase58();

  const currSignerBatch: Array<Keypair[]> = [];
  const currInstrBatch: Array<TransactionInstruction[]> = [];

  let cacheSigners: Keypair[] = [];
  let cacheInstructions: TransactionInstruction[] = [];
  const vaultCache = await getVaultCache(vault);

  for (let i = 0; i < tokenMints.length; i++) {
    const safetyDeposit = await getSafetyDepositBoxAddress(
      vault,
      tokenMints[i],
    );

    await setVaultCache(
      vaultCache,
      payer,
      vault,
      safetyDeposit,
      fractionManager,
      new BN(0),
      cacheInstructions,
    );

    if (cacheInstructions.length >= TRANSACTION_SIZE) {
      currSignerBatch.push(cacheSigners);
      currInstrBatch.push(cacheInstructions);
      cacheSigners = [];
      cacheInstructions = [];
    }
  }

  if (
    cacheInstructions.length < TRANSACTION_SIZE &&
    cacheInstructions.length > 0
  ) {
    currSignerBatch.push(cacheSigners);
    currInstrBatch.push(cacheInstructions);
  }

  return {
    vaultCache,
    instructions: currInstrBatch,
    signers: currSignerBatch,
  };
}
