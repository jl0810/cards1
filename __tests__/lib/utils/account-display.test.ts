/**
 * Tests for Account Display Utilities
 *
 * @satisfies US-031 - Customize Account Display Names
 */

import {
  getAccountDisplayName,
  formatAccountMask,
} from "@/lib/utils/account-display";

describe("getAccountDisplayName", () => {
  it("should return nickname when available", () => {
    const account = {
      name: "Credit Card",
      officialName: "Chase Freedom Unlimited",
      extended: {
        nickname: "My Travel Card",
      },
    };

    expect(getAccountDisplayName(account)).toBe("My Travel Card");
  });

  it("should return officialName when nickname is not set", () => {
    const account = {
      name: "Credit Card",
      officialName: "Chase Freedom Unlimited",
      extended: {
        nickname: null,
      },
    };

    expect(getAccountDisplayName(account)).toBe("Chase Freedom Unlimited");
  });

  it("should return name when neither nickname nor officialName is set", () => {
    const account = {
      name: "Credit Card",
      officialName: null,
      extended: null,
    };

    expect(getAccountDisplayName(account)).toBe("Credit Card");
  });

  it("should return name when extended is undefined", () => {
    const account = {
      name: "Credit Card",
      officialName: null,
    };

    expect(getAccountDisplayName(account)).toBe("Credit Card");
  });

  it("should handle empty nickname string", () => {
    const account = {
      name: "Credit Card",
      officialName: "Chase Freedom Unlimited",
      extended: {
        nickname: "",
      },
    };

    expect(getAccountDisplayName(account)).toBe("Chase Freedom Unlimited");
  });
});

describe("formatAccountMask", () => {
  it("should format mask with bullets", () => {
    expect(formatAccountMask("1234")).toBe("••1234");
  });

  it("should return empty string for null mask", () => {
    expect(formatAccountMask(null)).toBe("");
  });

  it("should handle different mask lengths", () => {
    expect(formatAccountMask("12")).toBe("••12");
    expect(formatAccountMask("123456")).toBe("••123456");
  });
});
