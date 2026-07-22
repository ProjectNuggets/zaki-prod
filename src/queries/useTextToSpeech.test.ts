import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { synthesizeSpeech } from "@/lib/api";
import { useTextToSpeechStore } from "./useTextToSpeech";

jest.mock("@/lib/api", () => ({
  synthesizeSpeech: jest.fn(),
}));

function createAudio() {
  return {
    pause: jest.fn(),
    removeAttribute: jest.fn(),
    load: jest.fn(),
    onended: null,
    onerror: null,
    src: "",
  } as unknown as HTMLAudioElement;
}

describe("useTextToSpeechStore account reset", () => {
  let revokeObjectUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    revokeObjectUrl = jest.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    useTextToSpeechStore.setState({
      activeMessageId: null,
      status: null,
      cache: {},
      cacheOrder: [],
      audio: null,
      generation: 0,
    });
  });

  it("stops playback and clears cached account audio during a principal switch", () => {
    const audio = createAudio();
    useTextToSpeechStore.setState({
      activeMessageId: "account-a-message",
      status: "playing",
      cache: {
        "account-a-message": "blob:account-a-message",
        "account-a-other": "blob:account-a-other",
      },
      cacheOrder: ["account-a-message", "account-a-other"],
      audio,
    });

    useTextToSpeechStore.getState().reset();

    expect(audio.pause).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:account-a-message");
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:account-a-other");
    expect(useTextToSpeechStore.getState()).toMatchObject({
      activeMessageId: null,
      status: null,
      cache: {},
      cacheOrder: [],
      audio: null,
      generation: 1,
    });
  });

  it("does not repopulate account A audio when synthesis finishes after a reset", async () => {
    const audio = createAudio();
    let resolveSynthesis: (value: {
      response: { ok: boolean; status: number };
      data: { audio: string; format: string };
    }) => void = () => undefined;
    (synthesizeSpeech as unknown as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSynthesis = resolve;
        })
    );
    useTextToSpeechStore.setState({ audio });

    const synthesis = useTextToSpeechStore.getState().toggle("account-a-message", "Read this");
    useTextToSpeechStore.getState().reset();
    resolveSynthesis({
      response: { ok: true, status: 200 },
      data: { audio: "YQ==", format: "mp3" },
    });
    await synthesis;

    expect(useTextToSpeechStore.getState()).toMatchObject({
      activeMessageId: null,
      status: null,
      cache: {},
      cacheOrder: [],
      audio: null,
      generation: 1,
    });
  });

  it("does not let a rejected account A synthesis clear account B playback with the same message id", async () => {
    const audio = createAudio();
    let rejectSynthesis: (reason?: unknown) => void = () => undefined;
    (synthesizeSpeech as unknown as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSynthesis = reject;
        })
    );
    useTextToSpeechStore.setState({ audio });

    const accountASynthesis = useTextToSpeechStore
      .getState()
      .toggle("shared-message", "Account A text");
    useTextToSpeechStore.getState().reset();
    useTextToSpeechStore.setState({
      activeMessageId: "shared-message",
      status: "fetching",
      audio: createAudio(),
    });
    rejectSynthesis(new Error("Account A synthesis failed"));

    await expect(accountASynthesis).rejects.toThrow("Account A synthesis failed");
    expect(useTextToSpeechStore.getState()).toMatchObject({
      activeMessageId: "shared-message",
      status: "fetching",
      generation: 1,
    });
  });

  it("does not let a rejected account A play call clear account B playback with the same message id", async () => {
    let rejectPlay: (reason?: unknown) => void = () => undefined;
    const accountAAudio = createAudio();
    accountAAudio.play = jest.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectPlay = reject;
        })
    );
    useTextToSpeechStore.setState({
      activeMessageId: null,
      status: null,
      cache: { "shared-message": "blob:account-a-message" },
      cacheOrder: ["shared-message"],
      audio: accountAAudio,
    });

    const accountAPlay = useTextToSpeechStore
      .getState()
      .toggle("shared-message", "Account A text");
    expect(accountAAudio.play).toHaveBeenCalledTimes(1);

    useTextToSpeechStore.getState().reset();
    useTextToSpeechStore.setState({
      activeMessageId: "shared-message",
      status: "playing",
      audio: createAudio(),
    });
    rejectPlay(new Error("Account A playback was rejected"));

    await accountAPlay;
    expect(useTextToSpeechStore.getState()).toMatchObject({
      activeMessageId: "shared-message",
      status: "playing",
      generation: 1,
    });
  });
});
