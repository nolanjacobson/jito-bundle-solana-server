import dotenv from 'dotenv';

dotenv.config();

export const config = {
  network: process.env.NETWORK || 'testnet',
  splTokenAddress: process.env.SPL_TOKEN_ADDRESS || 'CycM7mCcSvDUG6g6SiBDBXYvSQqBEvcXXNBddkVgEmuc',
  sourceTokenAddress: process.env.SOURCE_TOKEN_ADDRESS || '3b8iMBiULUETJ5wF4HSrCA2FbGSkSGCWGjspBWoLKh16',
};
