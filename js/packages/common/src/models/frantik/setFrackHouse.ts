import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';

import { FRACTION_SCHEMA, SetFrackHouseArgs } from '.';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function setFrackHouse(
  admin: StringPublicKey,
  payer: StringPublicKey,
  operatingConfig: StringPublicKey,
  instructions: TransactionInstruction[],
  isPublic: boolean,
) {
  const PROGRAM_IDS = programIds();
  const frack_house = PROGRAM_IDS.frack_house;
  if (!frack_house) {
    throw new Error('Frack House not initialized');
  }

  const value = new SetFrackHouseArgs({isPublic});
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(frack_house),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(operatingConfig),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(admin),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    { pubkey: PROGRAM_IDS.token, isSigner: false, isWritable: false },
    {
      pubkey: toPublicKey(PROGRAM_IDS.vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.metadata),
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

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
