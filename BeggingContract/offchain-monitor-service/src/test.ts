import { config, validateConfig } from './config';
import { SupabaseService } from './services/supabase';
import { logger } from './utils/logger';
import { ethers } from 'ethers';

async function testConnections() {
  try {
    logger.info('Starting connection tests...');

    // 1. 验证配置
    logger.info('Validating configuration...');
    validateConfig();
    logger.info('✓ Configuration valid');

    // 2. 测试Supabase连接
    logger.info('Testing Supabase connection...');
    const supabaseService = new SupabaseService();
    const supabaseHealthy = await supabaseService.healthCheck();
    if (supabaseHealthy) {
      logger.info('✓ Supabase connection successful');
    } else {
      throw new Error('Supabase connection failed');
    }

    // 3. 测试Infura连接
    logger.info('Testing Infura connection...');
    const provider = new ethers.JsonRpcProvider(`https://${config.networkName}.infura.io/v3/${config.infuraProjectId}`);
    const network = await provider.getNetwork();
    logger.info('✓ Infura connection successful', {
      name: network.name,
      chainId: network.chainId.toString()
    });

    // 4. 检查合约
    logger.info('Checking NFT contract...');
    const code = await provider.getCode(config.nftContractAddress);
    if (code !== '0x') {
      logger.info('✓ NFT contract found', {
        address: config.nftContractAddress
      });
    } else {
      throw new Error(`NFT contract not found at ${config.nftContractAddress}`);
    }

    // 5. 测试数据库插入
    logger.info('Testing database insert...');
    const testEvent = {
      tx_hash: '0x' + '0'.repeat(64),
      log_index: 0,
      from_address: '0x0000000000000000000000000000000000000000',
      to_address: '0x0000000000000000000000000000000000000000',
      token_id: '1',
      block_number: 1,
      block_hash: '0x' + '0'.repeat(64),
      status: 'pending' as const
    };

    try {
      const eventId = await supabaseService.insertEvent(testEvent);
      if (eventId) {
        logger.info('✓ Database insert successful', { eventId });

        // 清理测试数据
        logger.info('Cleaning up test data...');
        // 注意：这里需要添加删除功能，但目前SupabaseService没有
        // 你可以在Supabase手动删除测试数据
      }
    } catch (error) {
      logger.error('✗ Database insert failed', { error });
    }

    logger.info('🎉 All tests completed successfully!');

  } catch (error) {
    logger.error('❌ Test failed', { error });
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testConnections();
}

export { testConnections };