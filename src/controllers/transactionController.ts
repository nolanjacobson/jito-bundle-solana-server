import { Request, Response } from 'express';
import { SolanaService } from '../services/solanaService';
import { PublicKey } from '@solana/web3.js';

const solanaService = new SolanaService();

export const bundleTransfer = async (req: Request, res: Response) => {
  try {
    const { amount, destination } = req.body;
    const destinationPubKey = new PublicKey(destination);

    // Call the prepareSignedTransactionsAndSendBundle method
    const result = await solanaService.prepareSignedTransactionsAndSendBundle(destinationPubKey, amount);

    res.status(200).send(`Tokens sent successfully: ${result}`);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
};