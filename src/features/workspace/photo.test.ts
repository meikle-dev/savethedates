import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A controllable stand-in for sharp: each pipeline's toBuffer() settles only when the test says so.
const sharpMock = vi.hoisted(() => {
  const pipelines: Array<{ resolve: (value: Buffer) => void; reject: (error: Error) => void }> = [];
  const create = vi.fn(() => {
    const output = new Promise<Buffer>((resolve, reject) => pipelines.push({ resolve, reject }));
    const pipeline = { metadata: async () => ({ format: "jpeg" }), resize: () => pipeline, webp: () => pipeline, toBuffer: () => output };
    return pipeline;
  });
  return Object.assign(create, { concurrency: vi.fn(), cache: vi.fn(), pipelines });
});
vi.mock("sharp", () => ({ default: sharpMock }));

const photo = () => new File([new Uint8Array(16)], "photo.jpg", { type: "image/jpeg" });
const settle = () => new Promise((resolve) => setImmediate(resolve));
let preparePhoto: typeof import("./photo").preparePhoto;
let busy: string;

beforeEach(async () => {
  vi.resetModules();
  sharpMock.mockClear();
  sharpMock.concurrency.mockClear();
  sharpMock.cache.mockClear();
  sharpMock.pipelines.length = 0;
  ({ preparePhoto, photoBusyMessage: busy } = await import("./photo"));
});
afterEach(() => vi.useRealTimers());

describe("photo processing queue", () => {
  it("limits libvips to one thread without an operation cache", () => {
    expect(sharpMock.concurrency).toHaveBeenCalledWith(1);
    expect(sharpMock.cache).toHaveBeenCalledWith(false);
  });

  it("makes a second upload wait until the first finishes", async () => {
    const first = preparePhoto(photo());
    const second = preparePhoto(photo());
    await settle();
    expect(sharpMock).toHaveBeenCalledTimes(1);
    sharpMock.pipelines[0].resolve(Buffer.from("first"));
    await expect(first).resolves.toEqual(Buffer.from("first"));
    await settle();
    expect(sharpMock).toHaveBeenCalledTimes(2);
    sharpMock.pipelines[1].resolve(Buffer.from("second"));
    await expect(second).resolves.toEqual(Buffer.from("second"));
  });

  it("returns the busy message without decoding when the queue is full", async () => {
    const accepted = [preparePhoto(photo()), preparePhoto(photo()), preparePhoto(photo()), preparePhoto(photo())];
    await expect(preparePhoto(photo())).rejects.toThrow(busy);
    await settle();
    expect(sharpMock).toHaveBeenCalledTimes(1);
    for (let index = 0; index < accepted.length; index += 1) {
      await settle();
      sharpMock.pipelines[index].resolve(Buffer.from("ok"));
      await expect(accepted[index]).resolves.toEqual(Buffer.from("ok"));
    }
  });

  it("releases the place when processing throws or rejects", async () => {
    sharpMock.mockImplementationOnce(() => { throw new Error("decoder crashed"); });
    const thrown = preparePhoto(photo());
    const rejected = preparePhoto(photo());
    const later = preparePhoto(photo());
    await expect(thrown).rejects.toThrow("couldn’t read that photo");
    await settle();
    sharpMock.pipelines[0].reject(new Error("corrupt"));
    await expect(rejected).rejects.toThrow("couldn’t read that photo");
    await settle();
    sharpMock.pipelines[1].resolve(Buffer.from("later"));
    await expect(later).resolves.toEqual(Buffer.from("later"));
  });

  it("times out a long wait and frees its queue place", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const first = preparePhoto(photo());
    const timedOut = preparePhoto(photo());
    const outcome = expect(timedOut).rejects.toThrow(busy);
    await settle();
    await vi.advanceTimersByTimeAsync(20_000);
    await outcome;
    // All three waiting places are available again, and the timed-out request never receives the slot.
    const waiting = [preparePhoto(photo()), preparePhoto(photo()), preparePhoto(photo())];
    await expect(preparePhoto(photo())).rejects.toThrow(busy);
    sharpMock.pipelines[0].resolve(Buffer.from("first"));
    await expect(first).resolves.toEqual(Buffer.from("first"));
    for (let index = 0; index < waiting.length; index += 1) {
      await settle();
      expect(sharpMock).toHaveBeenCalledTimes(index + 2);
      sharpMock.pipelines[index + 1].resolve(Buffer.from("next"));
      await expect(waiting[index]).resolves.toEqual(Buffer.from("next"));
    }
  });
});
