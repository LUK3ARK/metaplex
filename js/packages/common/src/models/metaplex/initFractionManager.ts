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
import { MAX_FRACTION_MANAGER_SIZE } from '@oyster/common/dist/lib/actions/vault';

export async function initFractionManager(
  connection: Connection,
  fractionManager: StringPublicKey,
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
  externalFractionPriceAccount: StringPublicKey,
  authority: StringPublicKey,
  payer: StringPublicKey,
  acceptPayment: StringPublicKey,
  store: StringPublicKey,
  marketPoolSize: BN,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const fractionManagerRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_FRACTION_MANAGER_SIZE,
  );

  // todo !@!@
  const uninitializedFractionManager = SystemProgram.createAccount({
    fromPubkey: toPublicKey(payer),
    newAccountPubkey: toPublicKey(fractionManager),
    lamports: fractionManagerRentExempt,
    space: MAX_FRACTION_MANAGER_SIZE,
    programId: toPublicKey(PROGRAM_IDS.metaplex),
  });
  instructions.push(uninitializedFractionManager);

  const value = new InitFractionManagerArgs({orderbookMarketPoolSize: marketPoolSize});
  const data = Buffer.from(serialize(SCHEMA, value));
  // TODO - LEFT OFF HERE FIX THIS FUNCTION
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
      pubkey: toPublicKey(authority),
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

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
