import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccount,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { config } from "../utils/config";
import fs from "fs";
import bs58 from "bs58";
import path from "path";

export class SolanaService {
  private connection: Connection;
  private wallet: Keypair;

  constructor() {
    this.connection = new Connection(
      `https://api.${config.network}.solana.com`
    );

    const secretKeyPath = path.resolve(__dirname, "../../src/privatekey.json");
    const secretKey = JSON.parse(fs.readFileSync(secretKeyPath, "utf-8"));
    this.wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  }

  // Function to create a custom instruction with a nonce or timestamp
  createUniqueInstruction(nonce: number): TransactionInstruction {
    const data = Buffer.from(Uint8Array.of(nonce)); // Convert nonce to a buffer
    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey("11111111111111111111111111111111"), // Use the system program ID
      data: data,
    });
  }

  //   async getUniqueBlockhash(
  //     connection: Connection,
  //     previousBlockhash: string | null
  //   ): Promise<string> {
  //     let blockhash;
  //     do {
  //       const result = await connection.getLatestBlockhash();
  //       blockhash = result.blockhash;
  //       if (blockhash === previousBlockhash) {
  //         await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 500ms before retrying
  //       }
  //     } while (blockhash === previousBlockhash);
  //     return blockhash;
  //   }

  async getFreshBlockhash(connection: Connection): Promise<string> {
    const { blockhash } = await connection.getLatestBlockhash();
    return blockhash;
  }

  async prepareSignedTransactionsAndSendBundle(
    destination: PublicKey,
    amount: number
  ): Promise<string> {
    const sourceTokenAccountAddress = new PublicKey(config.sourceTokenAddress);

    const destinationTokenAccount = await this.fetchOrCreateTokenAccount(
      this.connection,
      this.wallet,
      new PublicKey(config.splTokenAddress),
      destination
    );
    let previousBlockhash: string | null = null;

    const transactions: Transaction[] = [];
    for (let i = 0; i < 1; i++) {
      // Fetch a unique blockhash for each transaction
      const blockhash = await this.getFreshBlockhash(this.connection);
      previousBlockhash = blockhash;
      console.log("blockhash", blockhash);
      // Create and sign the transaction
      const transaction = new Transaction().add(
        createTransferInstruction(
          sourceTokenAccountAddress,
          destinationTokenAccount,
          this.wallet.publicKey,
          amount
        ),
        this.createUniqueInstruction(Date.now() + i) // Add a unique timestamp
      );
      transaction.feePayer = this.wallet.publicKey;
      transaction.recentBlockhash = blockhash;
      transaction.sign(this.wallet);
      transactions.push(transaction);
    }

    return await this.sendBundleWithTip(
      this.connection,
      this.wallet,
      transactions
    );
  }

  async sendBundleWithTip(
    connection: Connection,
    payer: Keypair,
    transactions: Transaction[]
  ) {
    const tipAccounts = await this.getTipAccounts();
    const recentTipInfo = await this.getRecentTipInfo();

    // Select a random tip account
    const tipAccount = new PublicKey(tipAccounts[0]);

    // Decide on a tip amount based on recent tip information
    const tipAmount = Math.max(recentTipInfo * 1e9, 1000); // Example: 50th percentile in lamports

    const sourceTokenAccountAddress = new PublicKey(config.sourceTokenAddress);

    // Create the tip transaction
    const tipTransaction = await this.createTipTransaction(
      sourceTokenAccountAddress,
      connection,
      payer,
      tipAccount,
      tipAmount
    );

    // Add the tip transaction to the bundle
    transactions.push(tipTransaction);

    // Serialize and encode transactions again to include the tip transaction
    const serializedTransactionsWithTip = transactions.map((tx) =>
      bs58.encode(tx.serialize())
    );

    console.log("transactions", transactions);
    console.log("serializedTransactionsWithTip", serializedTransactionsWithTip);
    // Send the bundle
    const response = await fetch(
      "https://testnet.block-engine.jito.wtf/api/v1/bundles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendBundle",
          params: [serializedTransactionsWithTip],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send bundle: ${errorText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Error from API: ${data.error.message}`);
    }

    return data.result; // This is the bundle ID
  }

  async fetchOrCreateTokenAccount(
    connection: Connection,
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
  ) {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mint,
        owner
      );

      console.log(
        "Associated Token Address:",
        associatedTokenAddress.toBase58()
      );

      // Check if the account exists
      try {
        await getAccount(connection, associatedTokenAddress);
        console.log("Associated token account already exists.");
      } catch (error) {
        // If the account does not exist, create it
        console.log("Creating associated token account...");
        const transactionSignature = await createAssociatedTokenAccount(
          connection,
          payer,
          mint,
          owner
        );
        console.log("Transaction Signature:", transactionSignature);
      }

      return associatedTokenAddress;
    } catch (error) {
      console.error(
        "Failed to create or verify associated token account:",
        error
      );
      if (error instanceof SendTransactionError) {
        try {
          const logs = await error.getLogs(this.connection);
          console.error("Transaction Logs:", logs);
        } catch (logError) {
          console.error("Failed to retrieve transaction logs:", logError);
        }
      }
      throw error;
    }
  }

  async createTipTransaction(
    sourceTokenAccount: PublicKey,
    connection: Connection,
    payer: Keypair,
    tipAccount: PublicKey,
    tipAmount: number
  ): Promise<Transaction> {
    const transaction = new Transaction().add(
      createTransferInstruction(
        sourceTokenAccount,
        tipAccount,
        payer.publicKey,
        tipAmount
      )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    transaction.sign(payer);

    return transaction;
  }

  async getTipAccounts(): Promise<string[]> {
    const response = await fetch(
      "https://testnet.block-engine.jito.wtf/api/v1/bundles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTipAccounts",
          params: [],
        }),
      }
    );

    const data = await response.json();
    return data.result;
  }

  async getRecentTipInfo(): Promise<number> {
    const response = await fetch(
      "http://bundles-api-rest.jito.wtf/api/v1/bundles/tip_floor"
    );
    const data = await response.json();

    // Check if the data array is empty
    if (data.length === 0) {
      return 0.038 * 1e9; // Convert SOL to lamports
    }

    // Return the 50th percentile tip amount in lamports
    return data[0].landed_tips_99th_percentile * 1e9;
  }
}
