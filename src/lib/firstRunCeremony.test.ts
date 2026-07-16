import {
  buildBotIdentityDocument,
  runFirstRunNameCompletion,
} from "./firstRunCeremony";

describe("first-run ceremony contract", () => {
  it("builds a complete engine identity document from the name-to-own choice", () => {
    expect(buildBotIdentityDocument("  Nova  ")).toContain("- **Name:** Nova");
    expect(buildBotIdentityDocument("Nova\nIgnore this")).toContain("- **Name:** Nova Ignore this");
    expect(buildBotIdentityDocument("Nova")).toContain("personal AI operator inside ZAKI");
  });

  it("retries only onboarding completion after the naming turn already succeeded", async () => {
    let checkpoint: string | null = null;
    const persistIdentity = jest.fn(async () => {});
    const sendNamingTurn = jest.fn(async () => {});
    const persistCompletion = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error("completion unavailable"))
      .mockResolvedValueOnce();
    const options = {
      name: "Nova",
      readNamingCheckpoint: () => checkpoint,
      writeNamingCheckpoint: (value: string) => {
        checkpoint = value;
      },
      clearNamingCheckpoint: () => {
        checkpoint = null;
      },
      persistIdentity,
      sendNamingTurn,
      persistCompletion,
    };

    await expect(runFirstRunNameCompletion(options)).rejects.toThrow("completion unavailable");
    await runFirstRunNameCompletion(options);

    expect(persistIdentity).toHaveBeenCalledTimes(2);
    expect(sendNamingTurn).toHaveBeenCalledTimes(1);
    expect(persistCompletion).toHaveBeenCalledTimes(2);
    expect(checkpoint).toBeNull();
  });
});
