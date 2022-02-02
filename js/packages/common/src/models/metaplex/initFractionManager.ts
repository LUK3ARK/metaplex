import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Connection,
  Keypair,
} from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';
import {
  SCHEMA,
  InitFractionManagerArgs,
} from '.';
import { programIds, toPublicKey, StringPublicKey } from '../../utils';

export async function initFractionManager(
  fractionManager: StringPublicKey,
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
  externalFractionPriceAccount: StringPublicKey,
  fractionManagerAuthority: StringPublicKey,
  payer: StringPublicKey,
  acceptPayment: StringPublicKey,
  store: StringPublicKey,
  orderbookMarketPoolSize: BN,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  // todo - just set this to 0
  const value = new InitFractionManagerArgs({orderbookMarketPoolSize});
  console.log("!!!valueeee isss haha "+ value + " " + value.orderbookMarketPoolSize);
  const data = Buffer.from(serialize(SCHEMA, value));
  console.log("data isc--> ! " + data)

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
      pubkey: toPublicKey(acceptPayment),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
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

    console.log("data!!!  " + data);
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
