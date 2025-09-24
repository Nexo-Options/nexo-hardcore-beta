import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy("NLTPs", {
    from: deployer,
    log: true,
    args: [1660089600],
  })
}

deployment.tags = ["test", "NLTPs"]

export default deployment
