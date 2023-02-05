const assert = require("assert");
const anchor = require("@coral-xyz/anchor");
const { SystemProgram } = anchor.web3;
const fs = require("fs");

describe("basic", () => {
  // Use a local provider.
  const url = "http://127.0.0.1:8899";
  const options = anchor.AnchorProvider.defaultOptions();
  options.skipPreflight = true;
  const connection = new anchor.web3.Connection(url, options.commitment);

  const keypair_acc = Uint8Array.from(
    Buffer.from(JSON.parse(fs.readFileSync("./keys/admin.json")))
  );
  const admin = anchor.web3.Keypair.fromSecretKey(keypair_acc);
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, options);
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("./target/idl/basic.json", "utf8"));
  const programId = new anchor.web3.PublicKey(
    "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
  );

  // The program to execute.
  const program = new anchor.Program(idl, programId, provider);
  let _myAccount;

  it("Creates and initializes an account in a single atomic transaction (simplified)", async () => {
    // The Account to create.
    const myAccount = anchor.web3.Keypair.generate();

    // Create the new account and initialize it with the program.
    await program.methods
      .initialize(new anchor.BN(1234))
      .accounts({
        myAccount: myAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([myAccount])
      .rpc();

    // Fetch the newly created account from the cluster.
    const account = await program.account.myAccount.fetch(myAccount.publicKey);

    // Check it's state was initialized.
    assert.ok(account.data.eq(new anchor.BN(1234)));

    // Store the account for the next test.
    _myAccount = myAccount;
  });

  it("Updates a previously created account", async () => {
    const myAccount = _myAccount;

    // Invoke the update rpc.
    await program.methods
      .update(new anchor.BN(4321))
      .accounts({
        myAccount: myAccount.publicKey,
      })
      .rpc();

    // Fetch the newly updated account.
    const account = await program.account.myAccount.fetch(myAccount.publicKey);

    // Check it's state was mutated.
    assert.ok(account.data.eq(new anchor.BN(4321)));
  });
});
