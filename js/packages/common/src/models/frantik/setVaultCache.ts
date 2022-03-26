import {
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';

import { FRACTION_SCHEMA, SetVaultCacheArgs } from '.';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function setVaultCache(
  vaultCache: StringPublicKey,
  payer: StringPublicKey,
  vault: StringPublicKey,
  safetyDepositBox: StringPublicKey,
  fractionManager: StringPublicKey,
  page: BN,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const frackHouse = PROGRAM_IDS.frack_house;
  if (!frackHouse) {
    throw new Error('Frack House not initialized');
  }

  const value = new SetVaultCacheArgs();
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(vaultCache),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(fractionManager),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(frackHouse),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.system,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
