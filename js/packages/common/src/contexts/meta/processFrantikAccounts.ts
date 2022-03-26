import { AccountInfo, PublicKey } from '@solana/web3.js';
import {
  FrantikKey,
  decodeFractionManager,
  FractionManager,
  decodeVaultCache,
  VaultCache,
  decodeFrackHouseIndexer,
  FrackHouseIndexer,
  decodeFrackHouse,
  FrackHouse,
  decodeFractionSafetyDepositConfig,
  FractionSafetyDepositConfig,
  WhitelistedFracker,
  isFrackerPartOfFrackHouse,
  WhitelistedFrackerParser,
  OperatingConfig,
  decodeOperatingConfig,
} from '../../models';
import { ProcessAccountsFunc } from './types';
import { FRANTIK_ID, programIds, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts';
import { cache } from '../accounts';
import names from '../../config/userNames.json';

export const processFrantikAccounts: ProcessAccountsFunc = async (
  { account, pubkey },
  setter,
) => {
  if (!isFrantikAccount(account)) return;

  try {
    const FRACK_HOUSE_ID = programIds().frack_house;

    if (isFractionManagerV1Account(account)) {
      const frackHouseKey = new PublicKey(account.data.slice(2, 34));

      if (FRACK_HOUSE_ID && frackHouseKey.equals(FRACK_HOUSE_ID)) {
        const fractionManager = decodeFractionManager(account.data);

        const parsedAccount: ParsedAccount<FractionManager> = {
          pubkey,
          account,
          info: fractionManager,
        };
        setter(
          'fractionManagersByVault',
          fractionManager.vault,
          parsedAccount,
        );
      }
    }

    if (isVaultCacheV1Account(account)) {
      const cache = decodeVaultCache(account.data);
      const parsedAccount: ParsedAccount<VaultCache> = {
        pubkey,
        account,
        info: cache,
      };
      setter('vaultCaches', pubkey, parsedAccount);
    }

    if (isFrackHouseIndexerV1Account(account)) {
      const indexer = decodeFrackHouseIndexer(account.data);
      const parsedAccount: ParsedAccount<FrackHouseIndexer> = {
        pubkey,
        account,
        info: indexer,
      };
      if (parsedAccount.info.frackHouse == FRACK_HOUSE_ID?.toBase58()) {
        setter('frackHouseIndexer', pubkey, parsedAccount);
      }
    }

    if (isFrackHouseV1Account(account)) {
      const frackHouse = decodeFrackHouse(account.data);
      const parsedAccount: ParsedAccount<FrackHouse> = {
        pubkey,
        account,
        info: frackHouse,
      };
      if (FRACK_HOUSE_ID && pubkey === FRACK_HOUSE_ID.toBase58()) {
        setter('frackHouse', pubkey, parsedAccount);
      }
    }

    if (isFractionSafetyDepositConfigV1Account(account)) {
      const config = decodeFractionSafetyDepositConfig(account.data);
      const parsedAccount: ParsedAccount<FractionSafetyDepositConfig> = {
        pubkey,
        account,
        info: config,
      };
      setter(
        'fractionSafetyDepositConfigsByFractionManagerAndIndex',
        config.fractionManager + '-' + config.order.toNumber(),
        parsedAccount,
      );
    }

    if (isWhitelistedFrackerV1Account(account)) {
      const parsedAccount = cache.add(
        pubkey,
        account,
        WhitelistedFrackerParser,
        false,
      ) as ParsedAccount<WhitelistedFracker>;

      const isWhitelistedFracker = await isFrackerPartOfFrackHouse(
        parsedAccount.info.address,
        pubkey,
      );
      const nameInfo = (names as any)[parsedAccount.info.address];

      if (nameInfo) {
        parsedAccount.info = { ...parsedAccount.info, ...nameInfo };
      }
      if (isWhitelistedFracker) {
        setter(
          'whitelistedFrackersByFracker',
          parsedAccount.info.address,
          parsedAccount,
        );
      }
    }

    if(isOperatingConfigV1Account(account)) {
      const opConfig = decodeOperatingConfig(account.data);
      const parsedAccount: ParsedAccount<OperatingConfig> = {
        pubkey,
        account,
        info: opConfig,
      };

      setter('operatingConfig', pubkey, parsedAccount);
    }

  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isFrantikAccount = (account: AccountInfo<Buffer>) =>
  account && pubkeyToString(account.owner) === FRANTIK_ID;

const isFractionManagerV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.FractionManagerV1;

const isFrackHouseV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.FrackHouseV1;

const isFractionSafetyDepositConfigV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.FractionSafetyDepositConfigV1;

const isWhitelistedFrackerV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.WhitelistedFrackerV1;

const isVaultCacheV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.VaultCacheV1;

const isFrackHouseIndexerV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.FrackHouseIndexerV1;

const isOperatingConfigV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === FrantikKey.OperatingConfigV1;
