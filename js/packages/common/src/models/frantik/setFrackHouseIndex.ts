import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';

import { FRACTION_SCHEMA, SetFrackHouseIndexArgs } from '.';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function setFrackHouseIndex(
  frackHouseIndex: StringPublicKey,
  vaultCache: StringPublicKey,
  payer: StringPublicKey,
  page: BN,
  offset: BN,
  instructions: TransactionInstruction[],
  belowCache?: StringPublicKey,
  aboveCache?: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();
  const frackHouse = PROGRAM_IDS.frack_house;
  if (!frackHouse) {
    throw new Error('Frack House not initialized');
  }

  const value = new SetFrackHouseIndexArgs({ page, offset });
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(frackHouseIndex),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vaultCache),
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
  ];

  if (aboveCache) {
    keys.push({
      pubkey: toPublicKey(aboveCache),
      isSigner: false,
      isWritable: false,
    });
  }

  if (belowCache) {
    keys.push({
      pubkey: toPublicKey(belowCache),
      isSigner: false,
      isWritable: false,
    });
  }
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
