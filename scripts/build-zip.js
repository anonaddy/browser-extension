#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const extPackageJson = require('../package.json')

const DEST_DIR = path.join(__dirname, '../dist')
const DEST_ZIP_DIR = path.join(__dirname, '../dist-zip')

/** @type {typeof import('archiver').ZipArchive | null} */
let ZipArchiveClass = null

const getZipArchive = async () => {
  if (!ZipArchiveClass) {
    const { ZipArchive } = await import('archiver')
    ZipArchiveClass = ZipArchive
  }
  return ZipArchiveClass
}

const extractExtensionData = () => ({
  name: extPackageJson.name,
  version: extPackageJson.version,
})

const makeDestZipDirIfNotExists = () => {
  if (!fs.existsSync(DEST_ZIP_DIR)) {
    fs.mkdirSync(DEST_ZIP_DIR)
  }
}

const buildZip = async (src, dist, zipFilename) => {
  const ZipArchive = await getZipArchive()

  return new Promise((resolve, reject) => {
    console.info(`Building ${zipFilename}...`)

    const output = fs.createWriteStream(path.join(dist, zipFilename))
    const archive = new ZipArchive()
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
  manifest.commands = {
    ...(manifest.commands || {}),
    open_addy_extension: {
      suggested_key: {
        default: 'Alt+Shift+A',
      },
      description: 'Open addy.io extension',
    },
    toggle_addy_sidebar: {
      suggested_key: {
        default: 'Ctrl+Alt+S',
      },
      description: 'Toggle addy.io sidebar',
    },
  }
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
