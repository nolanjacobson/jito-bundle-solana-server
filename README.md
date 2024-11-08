## Setup Instructions

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/nolanjacobson/jito-bundle-solana-server
   cd jito-bundle-solana-server
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:

   - Create a `.env` file in the root directory and add the following (you can use the .env.example file as a template):
     ```plaintext
     SPL_TOKEN_ADDRESS=CycM7mCcSvDUG6g6SiBDBXYvSQqBEvcXXNBddkVgEmuc
     SOURCE_TOKEN_ADDRESS=3b8iMBiULUETJ5wF4HSrCA2FbGSkSGCWGjspBWoLKh16
     ```

4. **Fund Your Solana Wallet**:
   - Ensure your Solana wallet is funded and has the SPL tokens minted (the wallet in the src/privatekey.json file is already funded).

## Running the Server

- **Production**:
  ```bash
  npm start
  ```

## API Usage

- **Endpoint**: `POST /api/transfer`

- **Request Body**:
  ```json
  {
    "amount": 200,
    "destination": "<Recipient Public Key>"
  }
  ```

This setup provides a basic API server that can bundle two SPL token transfers. You can expand and refine this setup based on your specific requirements and security considerations.
