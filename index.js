const fs = require("fs");
const decompress = require("decompress");
const decompressBzip2 = require("decompress-bzip2");
const {
  getDateTimeISOFormat,
  downloadFromUlr,
  readPackagesFile,
  getFileSize,
  checkFileSum
} = require("./utils");

const kenhtaoRepoUrl = "https://repo.kenhtao.net/";
const packagesBz2Url = kenhtaoRepoUrl + "Packages.bz2";
const outdir = "./repo.kenhtao.net/";

const main = async () => {
  try {
    const currentTime = getDateTimeISOFormat();

    // make output dir if not exist
    if (!fs.existsSync(outdir + "debs")) {
      fs.mkdirSync(outdir + "debs", { recursive: true });
      console.log("Making debs output dir: ", outdir + "debs");
    }
    if (!fs.existsSync(outdir + currentTime)) {
      fs.mkdirSync(outdir + currentTime, { recursive: true });
      console.log("Making output dir: ", outdir + currentTime);
    }

    // download Packages.bz2 file and unzip
    const packagesBz2File = outdir + currentTime + "/Packages.bz2";
    await downloadFromUlr(packagesBz2Url, packagesBz2File);
    console.log("Downloaded: ", packagesBz2File);

    await decompress(packagesBz2File, outdir + currentTime, {
      plugins: [decompressBzip2({ path: "Packages" })]
    });
    console.log("Decompressed: ", outdir + currentTime + "/Packages");

    // process file
    const debs = await readPackagesFile(outdir + currentTime + "/Packages");
    console.log("Processed Packages file, total deb count: ", debs.length);

    let skippedCount = 0;
    let downloadedCount = 0;
    for (const deb of debs) {
      if (!deb || !deb.Filename || !deb.Size) return;

      // check if file exist and valid
      const debFile = outdir + deb.Filename.slice(2);
      if (
        getFileSize(debFile) === deb.Size ||
        (await checkFileSum(debFile, deb.MD5sum, deb.SHA1, deb.SHA256))
      ) {
        skippedCount++;
        console.log("Skipping (existed): ", debFile);
        continue;
      }

      // file not exist or mismatch size or hash, download it
      const debUrl = kenhtaoRepoUrl + deb.Filename.slice(2);
      await downloadFromUlr(debUrl, debFile);
      downloadedCount++;
      console.log("Downloaded: ", debUrl);
    }

    console.log(
      "Done! skippedCount: %s, downloadedCount: %s",
      skippedCount,
      downloadedCount
    );
  } catch (err) {
    console.log("Fatal error", err);
  }
};

main();

module.exports = { downloadFromUlr };
