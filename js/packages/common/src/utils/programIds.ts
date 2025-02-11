import { PublicKey } from '@solana/web3.js';
import { ORACLE_ID } from '..';
import { findProgramAddress } from '../utils';

import {
  METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  METAPLEX_ID,
  BPF_UPGRADE_LOADER_ID,
  SYSTEM,
  MEMO_ID,
  VAULT_ID,
  AUCTION_ID,
  PACK_CREATE_ID,
  FRANTIK_ID,
  toPublicKey,
} from './ids';

export const getStoreID = async (storeOwnerAddress?: string) => {
  if (!storeOwnerAddress) {
    return undefined;
  }

  console.log('Store owner', storeOwnerAddress, METAPLEX_ID);
  const programs = await findProgramAddress(
    [
      Buffer.from('metaplex'),
      toPublicKey(METAPLEX_ID).toBuffer(),
      toPublicKey(storeOwnerAddress).toBuffer(),
    ],
    toPublicKey(METAPLEX_ID),
  );
  const storeAddress = programs[0];

  return storeAddress;
};

export const getFrackHouseID = async (frackHouseOwnerAddress?: string) => {
  if (!frackHouseOwnerAddress) {
    return undefined;
  }

  console.log('Frack House owner', frackHouseOwnerAddress, FRANTIK_ID);
  const programs = await findProgramAddress(
    [
      Buffer.from('frantik'),
      toPublicKey(FRANTIK_ID).toBuffer(),
      toPublicKey(frackHouseOwnerAddress).toBuffer(),
    ],
    toPublicKey(FRANTIK_ID),
  );
  const frackHouseAddress = programs[0];

  return frackHouseAddress;
};

export const setProgramIds = async (store?: string) => {
  STORE = store ? toPublicKey(store) : undefined;
};

export const setFrackHouseId = async (frackHouse?: string) => {
  FRACK_HOUSE = frackHouse ? toPublicKey(frackHouse) : undefined;
};

let STORE: PublicKey | undefined;
let FRACK_HOUSE: PublicKey | undefined;

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    associatedToken: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    bpf_upgrade_loader: BPF_UPGRADE_LOADER_ID,
    system: SYSTEM,
    metadata: METADATA_PROGRAM_ID,
    memo: MEMO_ID,
    vault: VAULT_ID,
    auction: AUCTION_ID,
    metaplex: METAPLEX_ID,
    pack_create: PACK_CREATE_ID,
    oracle: ORACLE_ID,
    store: STORE,
    frack_house: FRACK_HOUSE,
    frantik: FRANTIK_ID,
  };
};
