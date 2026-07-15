const { spawnSync } = require("child_process")
const path = require("path")

const frontendDir = path.resolve(__dirname, "../../ledger-frontend")
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm"
const task = process.argv[2]
const extraArgs = process.argv.slice(3)

if (!task) {
    console.error("A frontend task is required, for example: install, dev, or build")
    process.exit(1)
}

const args = task === "install" ? ["install", ...extraArgs] : ["run", task, ...extraArgs]

const result = spawnSync(npmExecutable, args, {
    cwd: frontendDir,
    stdio: "inherit",
    shell: process.platform === "win32"
})

if (result.error) {
    console.error("Unable to run frontend task:", result.error.message)
    process.exit(1)
}

process.exit(result.status ?? 0)
