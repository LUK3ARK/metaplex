import { AccountInfo, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import { deserializeUnchecked } from 'borsh';
import {
  MasterEditionV2,
  METADATA,
  Metadata,
  SafetyDepositBox,
  Vault,
} from '../../actions';
import { ParsedAccount } from '../../contexts';
import {
  findProgramAddress,
  programIds,
  toPublicKey,
  StringPublicKey,
} from '../../utils';
import { CACHE, INDEX, TupleNumericType } from '../metaplex';


export * from './initFractionManager';
export * from './validateFractionSafetyDepositBox';
export const FRANTIK_PREFIX = 'frantik';

// TODO
export enum FrantikKey {
  Uninitialized = 0,
  StoreIndexerV1 = 1,
  VaultCacheV1 = 2,
  FractionManagerV1 = 3,
  FractionSafetyDepositConfigV1 = 4,
  StoreV1 = 5,

}

export class FractionStoreIndexer {
  key: FrantikKey = FrantikKey.StoreIndexerV1;
  store: StringPublicKey;
  page: BN;
  vaultCaches: StringPublicKey[];

  constructor(args: {
    store: StringPublicKey;
    page: BN;
    vaultCaches: StringPublicKey[];
  }) {
    this.key = FrantikKey.StoreIndexerV1;
    this.store = args.store;
    this.page = args.page;
    this.vaultCaches = args.vaultCaches;
  }
}

export class VaultCache {
  key: FrantikKey = FrantikKey.VaultCacheV1;
  store: StringPublicKey;
  timestamp: BN;
  metadata: StringPublicKey[];
  vault: StringPublicKey;
  fractionManager: StringPublicKey;

  constructor(args: {
    store: StringPublicKey;
    timestamp: BN;
    metadata: StringPublicKey[];
    vault: StringPublicKey;
    fractionManager: StringPublicKey;
  }) {
    this.key = FrantikKey.VaultCacheV1;
    this.store = args.store;
    this.timestamp = args.timestamp;
    this.metadata = args.metadata;
    this.vault = args.vault;
    this.fractionManager = args.fractionManager;
  }
}

export class FractionManager {
  key: FrantikKey;
  store: StringPublicKey;
  authority: StringPublicKey;
  vault: StringPublicKey;
  state: FractionManagerState;

  constructor(args: {
    store: StringPublicKey;
    authority: StringPublicKey;
    vault: StringPublicKey;
    state: FractionManagerState;
  }) {
    this.key = FrantikKey.FractionManagerV1;
    this.store = args.store;
    this.authority = args.authority;
    this.vault = args.vault;
    this.state = args.state;
  }
}

// TODO - SET INSTRUCTIONS FOR EVERYTHING
export class FractionManagerState {
  status: FractionManagerStatus = FractionManagerStatus.Initialized;
  safetyConfigItemsValidated: BN = new BN(0);

  constructor(args?: FractionManagerState) {
    Object.assign(this, args);
  }
}

export class RedeemTokenBuyoutArgs {
  instruction = 2;
}

export class RedeemFullRightsBuyoutArgs {
  instruction = 3;
}

export enum ProxyCallBuyoutAddress {
  RedeemTokenBuyout = 0,
  RedeemFullRightsBuyout = 1,
}

export class SetFractionStoreArgs {
  instruction = 8;
  public: boolean;
  constructor(args: { public: boolean }) {
    this.public = args.public;
  }
}

export class DecommissionFractionManagerArgs {
  instruction = 13;
}

export class SetFractionStoreIndexArgs {
  instruction = 21;
  page: BN;
  offset: BN;
  constructor(args: { page: BN; offset: BN }) {
    this.page = args.page;
    this.offset = args.offset;
  }
}

export class SetVaultCacheArgs {
  instruction = 22;
}

export enum FractionWinningConfigType {
  // TODO - FIX NOTES
  /// You may be selling your one-of-a-kind NFT for the first time, but not it's accompanying Metadata,
  /// of which you would like to retain ownership. You get 100% of the payment the first sale, then
  /// royalties forever after.
  ///
  /// You may be re-selling something like a Limited/Open Edition print from another auction,
  /// a master edition record token by itself (Without accompanying metadata/printing ownership), etc.
  /// This means artists will get royalty fees according to the top level royalty % on the metadata
  /// split according to their percentages of contribution.
  ///
  /// No metadata ownership is transferred in this instruction, which means while you may be transferring
  /// the token for a limited/open edition away, you would still be (nominally) the owner of the limited edition
  /// metadata, though it confers no rights or privileges of any kind.
  FractionMasterEdtionV2,
  /// Means you are fractionalising the master edition record and it's metadata ownership as well as the
  /// token itself. The other person will be able to mint authorization tokens and make changes to the
  /// artwork (once combined and redeemable by the new owner).
  FractionToken,
}

export const decodeFractionStoreIndexer = (buffer: Buffer) => {
  return deserializeUnchecked(FRACTION_SCHEMA, FractionStoreIndexer, buffer) as FractionStoreIndexer;
};

export const decodeVaultCache = (buffer: Buffer) => {
  return deserializeUnchecked(FRACTION_SCHEMA, VaultCache, buffer) as VaultCache;
};

export const decodeFractionStore = (buffer: Buffer) => {
  return deserializeUnchecked(FRACTION_SCHEMA, FractionStore, buffer) as FractionStore;
};

export const decodeFractionManager = (
  buffer: Buffer,
): FractionManager => {
  return deserializeUnchecked(FRACTION_SCHEMA, FractionManager, buffer);
};

export const decodeFractionSafetyDepositConfig = (buffer: Buffer) => {
  return new FractionSafetyDepositConfig({
    data: buffer,
  });
};

// todo - fix this dont need this, but I do want to redo whole store thing anyway...
export class FractionStore {
  key: FrantikKey = FrantikKey.StoreV1;
  public: boolean = true;
  tokenVaultProgram: StringPublicKey;
  auctionProgram: StringPublicKey;
  tokenMetadataProgram: StringPublicKey;
  tokenProgram: StringPublicKey;

  constructor(args: {
    public: boolean;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;
  }) {
    this.key = FrantikKey.StoreV1;
    this.public = args.public;
    this.auctionProgram = args.auctionProgram;
    this.tokenVaultProgram = args.tokenVaultProgram;
    this.tokenMetadataProgram = args.tokenMetadataProgram;
    this.tokenProgram = args.tokenProgram;
  }
}

export interface FractionViewItem {
  winningConfigType: FractionWinningConfigType;
  amount: BN;
  metadata: ParsedAccount<Metadata>;
  safetyDeposit: ParsedAccount<SafetyDepositBox>;
  masterEdition?: ParsedAccount<MasterEditionV2>;
}

// TODO - make sure these are right
export enum FractionManagerStatus {
  Initialized,
  Validated,
  Running,
  Disbursing,
  Finished,
}

export class InitFractionManagerArgs {
  instruction = 17;
}

export class FractionSafetyDepositConfig {
  key: FrantikKey = FrantikKey.FractionSafetyDepositConfigV1;
  fractionManager: StringPublicKey = SystemProgram.programId.toBase58();
  order: BN = new BN(0);
  fractionWinningConfigType: FractionWinningConfigType = FractionWinningConfigType.FractionToken;

  constructor(args: {
    data?: Uint8Array;
    directArgs?: {
      fractionManager: StringPublicKey;
      order: BN;
      fractionWinningConfigType: FractionWinningConfigType;
    };
  }) {
    if (args.directArgs) {
      Object.assign(this, args.directArgs);
    } else if (args.data) {

      this.fractionManager = bs58.encode(args.data.slice(1, 33));
      this.order = new BN(args.data.slice(33, 41), 'le');
      this.fractionWinningConfigType = args.data[41];
    }
  }

  // TODO - Maybe can bring this and other function out as common in both this and normal safetydepositconfigs
  getBNFromData(
    data: Uint8Array,
    offset: number,
    dataType: TupleNumericType,
  ): BN {
    switch (dataType) {
      case TupleNumericType.U8:
        return new BN(data[offset], 'le');
      case TupleNumericType.U16:
        return new BN(data.slice(offset, offset + 2), 'le');
      case TupleNumericType.U32:
        return new BN(data.slice(offset, offset + 4), 'le');
      case TupleNumericType.U64:
        return new BN(data.slice(offset, offset + 8), 'le');
    }
  }
}

export class ValidateFractionSafetyDepositBoxArgs {
  instruction = 18;
  safetyDepositConfig: FractionSafetyDepositConfig;
  constructor(safetyDeposit: FractionSafetyDepositConfig) {
    this.safetyDepositConfig = safetyDeposit;
  }
}

export const FRACTION_SCHEMA = new Map<any, any>([
  [
    FractionStoreIndexer,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkeyAsString'],
        ['page', 'u64'],
        ['auctionCaches', ['pubkeyAsString']],
      ],
    },
  ],
  [
    VaultCache,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkeyAsString'],
        ['timestamp', 'u64'],
        ['metadata', ['pubkeyAsString']],
        ['auction', 'pubkeyAsString'],
        ['vault', 'pubkeyAsString'],
        ['auctionManager', 'pubkeyAsString'],
      ],
    },
  ],
  [
    FractionManager,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkeyAsString'],
        ['authority', 'pubkeyAsString'],
        ['vault', 'pubkeyAsString'],
        ['state', FractionManagerState],
      ],
    },
  ],
  [
    FractionStore,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['public', 'u8'],
        ['auctionProgram', 'pubkeyAsString'],
        ['tokenVaultProgram', 'pubkeyAsString'],
        ['tokenMetadataProgram', 'pubkeyAsString'],
        ['tokenProgram', 'pubkeyAsString'],
      ],
    },
  ],
  [
    FractionManagerState,
    {
      kind: 'struct',
      fields: [
        ['status', 'u8'],
        ['safetyConfigItemsValidated', 'u64'],
      ],
    },
  ],
  [
    FractionSafetyDepositConfig,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['fractionManager', 'pubkeyAsString'],
        ['order', 'u64'],
        ['fractionWinningConfigType', 'u8'],
      ],
    },
  ],
  [
    DecommissionFractionManagerArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    InitFractionManagerArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
      ],
    },
  ],
  [
    ValidateFractionSafetyDepositBoxArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['safetyDepositConfig', FractionSafetyDepositConfig],
      ],
    },
  ],
  [
    RedeemTokenBuyoutArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    RedeemFullRightsBuyoutArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    SetVaultCacheArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    SetFractionStoreIndexArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['page', 'u64'],
        ['offset', 'u64'],
      ],
    },
  ],
  [
    SetFractionStoreArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['public', 'u8'], //bool
      ],
    },
  ],
]);

export async function getFractionManagerKey(
  vault: string,
  fractionMint: string,
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [Buffer.from(FRANTIK_PREFIX), toPublicKey(vault).toBuffer()],
      toPublicKey(PROGRAM_IDS.frantik),
    )
  )[0];
}

export async function getFractionOriginalAuthority(
  vaultKey: string,
  metadata: string,
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(FRANTIK_PREFIX),
        toPublicKey(vaultKey).toBuffer(),
        toPublicKey(metadata).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.frantik),
    )
  )[0];
}

export async function getFractionSafetyDepositConfig(
  fractionManager: string,
  safetyDeposit: string,
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  return (
    await findProgramAddress(
      [
        Buffer.from(FRANTIK_PREFIX),
        toPublicKey(PROGRAM_IDS.frantik).toBuffer(),
        toPublicKey(fractionManager).toBuffer(),
        toPublicKey(safetyDeposit).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.frantik),
    )
  )[0];
}

export async function getFractionStoreIndexer(page: number) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  return (
    await findProgramAddress(
      [
        Buffer.from(FRANTIK_PREFIX),
        toPublicKey(PROGRAM_IDS.frantik).toBuffer(),
        toPublicKey(store).toBuffer(),
        Buffer.from(INDEX),
        Buffer.from(page.toString()),
      ],
      toPublicKey(PROGRAM_IDS.frantik),
    )
  )[0];
}

export async function getVaultCache(vault: StringPublicKey) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }
  console.log('Vault', vault);
  return (
    await findProgramAddress(
      [
        Buffer.from(FRANTIK_PREFIX),
        toPublicKey(PROGRAM_IDS.frantik).toBuffer(),
        toPublicKey(store).toBuffer(),
        toPublicKey(vault).toBuffer(),
        Buffer.from(CACHE),
      ],
      toPublicKey(PROGRAM_IDS.frantik),
    )
  )[0];
}
