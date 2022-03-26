import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { FRACTION_SCHEMA, InitFractionManagerArgs } from '../frantik';
import { programIds, toPublicKey, StringPublicKey } from '../../utils';

export async function initFractionManager(
  fractionManager: StringPublicKey,
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
  fractionMint: StringPublicKey,
  externalFractionPriceAccount: StringPublicKey,
  fractionManagerAuthority: StringPublicKey,
  payer: StringPublicKey,
  frackHouse: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const value = new InitFractionManagerArgs();
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(fractionManager),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(tokenMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(externalFractionPriceAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(fractionManagerAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(frackHouse),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  // todo
  console.log('data!!!  ' + data);
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
