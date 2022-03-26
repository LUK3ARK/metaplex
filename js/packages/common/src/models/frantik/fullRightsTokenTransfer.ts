import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  FullRightsTokenTransferArgs,
  FRACTION_SCHEMA,
} from '.';
import { VAULT_PREFIX } from '../../actions';
import {
  findProgramAddress,
  programIds,
  StringPublicKey,
  toPublicKey,
} from '../../utils';

export async function fullRightsTokenTransfer(
  vault: StringPublicKey,
  safetyDepositTokenStore: StringPublicKey,
  destination: StringPublicKey,
  safetyDeposit: StringPublicKey,
  fractionMint: StringPublicKey,
  vaultAuthority: StringPublicKey,
  fractionManager: StringPublicKey,
  payer: StringPublicKey,
  instructions: TransactionInstruction[],
  masterMetadata: StringPublicKey,
  newAuthority: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const transferAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault),
    )
  )[0];

  const value = new FullRightsTokenTransferArgs();
  const data = Buffer.from(serialize(FRACTION_SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(destination),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDepositTokenStore),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDeposit),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(fractionManager),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(masterMetadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(newAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
      isSigner: false,
      isWritable: false,
    },
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
      pubkey: store,
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
    {
      pubkey: toPublicKey(masterMetadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(newAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: true,
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
