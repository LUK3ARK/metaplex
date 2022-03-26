import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  getFractionManagerKey,
  getFrackOriginalAuthority,
  getFractionSafetyDepositConfig,
  FractionSafetyDepositConfig,
  FRACTION_SCHEMA,
  ValidateFractionSafetyDepositBoxArgs,
} from '../frantik';
import { programIds, toPublicKey, StringPublicKey } from '../../utils';

export async function validateFractionSafetyDepositBox(
  vault: StringPublicKey,
  metadata: StringPublicKey,
  safetyDepositBox: StringPublicKey,
  safetyDepositTokenStore: StringPublicKey,
  tokenMint: StringPublicKey,
  fractionManagerAuthority: StringPublicKey,
  metadataAuthority: StringPublicKey,
  payer: StringPublicKey,
  instructions: TransactionInstruction[],
  edition: StringPublicKey,
  whitelistedFracker: StringPublicKey | undefined,
  store: StringPublicKey,
  safetyDepositConfig: FractionSafetyDepositConfig,
  fractionalMint: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();

  const fractionManagerKey = await getFractionManagerKey(vault, fractionalMint);

  const originalAuthorityLookup = await getFrackOriginalAuthority(
    vault,
    metadata,
  );

  const safetyDepositConfigKey = await getFractionSafetyDepositConfig(
    fractionManagerKey,
    safetyDepositBox,
  );

  const value = new ValidateFractionSafetyDepositBoxArgs(safetyDepositConfig);
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(safetyDepositConfigKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(metadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(originalAuthorityLookup),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(whitelistedFracker || SystemProgram.programId),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(safetyDepositTokenStore),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(tokenMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(edition),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(fractionManagerAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(metadataAuthority),
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.metadata),
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

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.frantik),
      data,
    }),
  );
}
