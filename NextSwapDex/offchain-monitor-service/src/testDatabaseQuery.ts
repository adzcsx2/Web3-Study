import { SupabaseService } from './services/supabase';
import { logger } from './utils/logger';

async function testDatabaseQuery() {
  try {
    logger.info('🔍 Testing database query functionality...');

    const supabaseService = new SupabaseService();

    // 检查数据库连接
    const isHealthy = await supabaseService.healthCheck();
    if (!isHealthy) {
      throw new Error('Database connection failed');
    }

    logger.info('✅ Database connection successful');

    // 查询所有事件
    const allEvents = await supabaseService.getPendingEvents();
    logger.info(`📊 Found ${allEvents.length} pending events in database`);

    if (allEvents.length > 0) {
      logger.info('📋 Recent events:');
      allEvents.slice(0, 5).forEach((event, index) => {
        logger.info(`  ${index + 1}. TX: ${event.tx_hash.substring(0, 10)}..., From: ${event.from_address?.substring(0, 10)}..., To: ${event.to_address?.substring(0, 10)}...`);
      });
    }

    // 检查是否有重复事件
    if (allEvents.length > 0) {
      const eventCounts = allEvents.reduce((acc: any, event) => {
        const key = `${event.tx_hash}-${event.log_index}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const duplicates = Object.entries(eventCounts).filter(([, count]: any) => count > 1);
      if (duplicates.length > 0) {
        logger.warn(`⚠️ Found ${duplicates.length} duplicate events`);
      } else {
        logger.info('✅ No duplicate events found');
      }
    }

    logger.info('🎉 Database query test completed successfully!');

  } catch (error) {
    logger.error('❌ Database query test failed', { error });
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testDatabaseQuery();
}

export { testDatabaseQuery };