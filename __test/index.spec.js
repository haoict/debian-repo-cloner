const assert = require("assert");
const sinon = require("sinon");
const {
  getDateTimeISOFormat,
  downloadFromUlr,
  readPackagesFile,
  getFileSize,
  checkFileSum
} = require("../utils");

describe("getDateTimeISOFormat test", () => {
  it("use init date", () => {
    // use init date
    const date = new Date("2020-03-31T05:14:10Z");
    const dateString = getDateTimeISOFormat(date);
    assert.equal(dateString, "20200331051410");
  });

  it("use sinon to mock current date", () => {
    // use sinon to mock Date.now
    const clock = sinon.useFakeTimers({
      now: new Date("2020-03-31T05:14:10Z"),
      shouldAdvanceTime: true,
      advanceTimeDelta: 20
    });
    const dateString = getDateTimeISOFormat();
    assert.equal(dateString, "20200331051410");
    clock.restore();
  });
});

describe("downloadFromUlr test", () => {
  it("url file not found", async () => {
    try {
      await downloadFromUlr("http://thisisfakeurl.lol", "....");
    } catch (err) {
      assert.equal(err.code, "ENOTFOUND");
    }
  });

  it("url ok", async () => {
    await downloadFromUlr("http://google.com", "/dev/null");
    await downloadFromUlr("https://google.com", "/dev/null");
  });
});

describe("readPackagesFile test", () => {
  it("file not exist", async () => {
    try {
      await readPackagesFile("__test/testPackages1");
    } catch (err) {
      assert.equal(err.message, "File not exist");
    }
  });

  it("normal file", async () => {
    const debs = await readPackagesFile("__test/testPackages");
    const expected = [
      {
        Package: "applist",
        Version: "1.5.15~beta1",
        Section: "System",
        Icon: "file:///Applications/Cydia.app/Sections/hethong.png",
        MD5sum: "01b79849cf6bb141f537257d3248b75b"
      },
      {
        Package: "ch.mdaus.utils",
        Version: "0.0.4",
        Section: "Addons",
        Filename: "./debs/1598.deb",
        MD5sum: "30d6b7cb77b8ce30d74449ed86e1cd2f",
        SHA1: "a0c874c5a5b99be29b7923d5c862b4a8042093ad"
      }
    ];
    assert.deepEqual(debs, expected);
  });
});

describe("getFileSize test", () => {
  it("file not exist", () => {
    const size = getFileSize("__test/1111.deb");
    assert.equal(size, 0);
  });

  it("normal file", () => {
    const size = getFileSize("__test/1279.deb");
    assert.equal(size, 104748);
  });
});

describe("checkFileSum test", () => {
  it("file not exist -> error", async () => {
    try {
      await checkFileSum(
        "__test/1111.deb",
        "01b79849cf6bb141f537257d3248b75b",
        "9e40154d1bda682f395bfe1902dfc418ba7283eb",
        "daa8e6f3d0b5308314bd3fc044602afef7776f138f7f18e01d1cfc732a776890"
      );
    } catch (err) {
      assert.equal(err.message, "File not exist");
    }
  });

  it("all hash correct -> ok without strict mode", async () => {
    let isOk = await checkFileSum(
      "__test/1279.deb",
      "01b79849cf6bb141f537257d3248b75b",
      "9e40154d1bda682f395bfe1902dfc418ba7283eb",
      "daa8e6f3d0b5308314bd3fc044602afef7776f138f7f18e01d1cfc732a776890"
    );
    assert.equal(isOk, true);
  });

  it("all hash correct -> ok with strict mode", async () => {
    let isOk = await checkFileSum(
      "__test/1279.deb",
      "01b79849cf6bb141f537257d3248b75b",
      "9e40154d1bda682f395bfe1902dfc418ba7283eb",
      "daa8e6f3d0b5308314bd3fc044602afef7776f138f7f18e01d1cfc732a776890",
      true
    );
    assert.equal(isOk, true);
  });

  it("all hash incorrect -> not ok without strict mode", async () => {
    isOk = await checkFileSum("__test/1279.deb", "1", "2", "3");
    assert.equal(isOk, false);
  });

  it("only one hash correct -> ok without strict mode", async () => {
    isOk = await checkFileSum(
      "__test/1279.deb",
      "01b79849cf6bb141f537257d3248b75b",
      "2",
      "3"
    );
    assert.equal(isOk, true);
  });

  it("2 hash correct, 1 incorrect -> not ok with strict mode", async () => {
    isOk = await checkFileSum(
      "__test/1279.deb",
      "01b79849cf6bb141f537257d3248b75b",
      "2",
      "daa8e6f3d0b5308314bd3fc044602afef7776f138f7f18e01d1cfc732a776890",
      true
    );
    assert.equal(isOk, false);
  });
});
