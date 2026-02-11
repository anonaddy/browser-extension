#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
// eslint-disable-next-line
var archiver = require('archiver')

const extPackageJson = require('../package.json')

const DEST_DIR = path.join(__dirname, '../dist')
const DEST_ZIP_DIR = path.join(__dirname, '../dist-zip')

const extractExtensionData = () => ({
  name: extPackageJson.name,
  version: extPackageJson.version,
})

const makeDestZipDirIfNotExists = () => {
  if (!fs.existsSync(DEST_ZIP_DIR)) {
    fs.mkdirSync(DEST_ZIP_DIR)
  }
}

const buildZip = (src, dist, zipFilename) => {
  return new Promise((resolve, reject) => {
    console.info(`Building ${zipFilename}...`)

    const output = fs.createWriteStream(path.join(dist, zipFilename))
    const archive = archiver('zip')
    archive.on('error', reject)
    output.on('error', reject)
    output.on('close', () => resolve())

    archive.pipe(output)
    archive.directory(src, false)
    archive.finalize()
  })
}

/**
 * Copy dist to a temp dir and patch manifest.json for Firefox (add background.scripts).
 * Returns path to the temp dir (caller must clean up).
 */
const prepareFirefoxDist = () => {
  const firefoxDir = path.join(__dirname, '../dist-firefox')
  if (fs.existsSync(firefoxDir)) {
    fs.rmSync(firefoxDir, { recursive: true })
  }
  fs.cpSync(DEST_DIR, firefoxDir, { recursive: true })

  const manifestPath = path.join(firefoxDir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!manifest.background) manifest.background = {}
  manifest.background.scripts = ['background.js']
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  return firefoxDir
}

const main = async () => {
  const { name, version } = extractExtensionData()

  makeDestZipDirIfNotExists()

  await buildZip(DEST_DIR, DEST_ZIP_DIR, `${name}-v${version}.zip`)

  const firefoxDir = prepareFirefoxDist()
  try {
    await buildZip(firefoxDir, DEST_ZIP_DIR, `${name}-v${version}-firefox.zip`)
  } finally {
    fs.rmSync(firefoxDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
