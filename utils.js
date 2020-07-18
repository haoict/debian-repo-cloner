const fs = require("fs");
const lineReader = require("line-reader");
const crypto = require("crypto");
const path = require("path");
const axios = require("axios");
const progressBar = require("progress");

function getDateTimeISOFormat(initDate) {
  // get current Japan time
  const newDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const date = initDate || newDate;

  return date.toISOString().replace(/T|-|:/g, "").replace(/\..+/, "");
}

function roundFloat(num, decimalPlaces = 2) {
  return +(Math.round(num + "e+" + decimalPlaces) + "e-" + decimalPlaces);
}

function downloadFromUlr(url, dest) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data, headers } = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const totalLength = parseInt(headers["content-length"], 10);
      const lengthInKB = totalLength / 1024;

      const pBar = new progressBar(
        `-> downloading [:bar]  ${roundFloat(lengthInKB, 0)}(KB)  :elapsed(s)   :percent  :customRateInKB(KB/s) `, // prettier-ignore
        {
          width: 40,
          complete: "=",
          incomplete: " ",
          total: totalLength,
        }
      );

      const writer = fs.createWriteStream(path.resolve(dest));

      data.on("data", (chunk) =>
        pBar.tick(chunk.length, { customRateInKB: chunk.length / 8 })
      );
      data.pipe(writer);

      writer.on("finish", () => {
        resolve(true);
      });
    } catch (err) {
      reject(err);
    }
  });
}

function readPackagesFile(packagesFile) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(packagesFile)) {
      reject(new Error("File not exist"));
    }

    const debs = [];
    let deb = {};

    lineReader.eachLine(packagesFile, (line, isLast) => {
      const lineAttr = line.split(":");

      if (line.length <= 1) {
        debs.push(deb);
        deb = {};
      } else {
        const attr1 = lineAttr.slice(1).join(":").trim();
        if (!lineAttr[0] || !attr1) return;
        deb[lineAttr[0]] = attr1;
      }

      if (isLast) {
        debs.filter((deb) => deb.Filename);
        resolve(debs);
      }
    });
  });
}

function getFileSize(file) {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const fileSizeInBytes = stats["size"];
    return fileSizeInBytes;
  }
  return 0;
}

function checkFileSum(file, md5, sha1, sha256, strict = false) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(file)) {
        resolve(false);
        return;
      }

      const s = fs.ReadStream(file);
      const md5Algo = crypto.createHash("md5");
      const sha1Algo = crypto.createHash("sha1");
      const sha256Algo = crypto.createHash("sha256");

      s.on("data", function (d) {
        md5Algo.update(d);
        sha1Algo.update(d);
        sha256Algo.update(d);
      });
      s.on("end", function () {
        const md5Actual = md5Algo.digest("hex");
        const sha1Actual = sha1Algo.digest("hex");
        const sha256Actual = sha256Algo.digest("hex");

        // strict mode: compare all type of hash
        if (strict) {
          if (
            md5 === md5Actual &&
            sha1 === sha1Actual &&
            sha256 === sha256Actual
          ) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          if (
            md5 === md5Actual ||
            sha1 === sha1Actual ||
            sha256 === sha256Actual
          ) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  getDateTimeISOFormat,
  roundFloat,
  downloadFromUlr,
  readPackagesFile,
  getFileSize,
  checkFileSum,
};
