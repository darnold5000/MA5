import { afterEach, describe, expect, it } from "vitest";

import {
  brandAvatarPath,
  exerciseVideoPrefix,
  memberJourneyPhotoPath,
} from "./storage-paths";

const TENANT = "d71ada88-8fad-466f-9264-3a479d54d6e2";

describe("storage-paths", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("prefixes journey photos with tenant id", () => {
    process.env.NEXT_PUBLIC_MA5_TENANT_ID = TENANT;
    expect(memberJourneyPhotoPath("user-1", "file-1")).toBe(
      `${TENANT}/members/user-1/file-1.jpg`,
    );
  });

  it("prefixes brand avatars with tenant id", () => {
    process.env.MA5_TENANT_ID = TENANT;
    process.env.MA5_LOCATION_ID = "ac85a800-91cc-4ba5-a42c-9b55eac4653a";
    expect(brandAvatarPath("user-1", "abc")).toBe(
      `${TENANT}/brand/avatars/user-1/abc.jpg`,
    );
  });

  it("builds exercise video prefix", () => {
    process.env.NEXT_PUBLIC_MA5_TENANT_ID = TENANT;
    expect(exerciseVideoPrefix("ex-1")).toBe(`${TENANT}/exercises/ex-1/`);
  });
});
