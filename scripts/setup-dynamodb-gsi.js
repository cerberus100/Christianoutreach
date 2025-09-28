#!/usr/bin/env node

/**
 * DynamoDB GSI Setup Script
 *
 * This script creates the Global Secondary Index (GSI) for the submissions table
 * to enable efficient querying by churchId and submissionDate.
 *
 * Environment Variables Required:
 * - AWS_REGION or APP_AWS_REGION
 * - APP_ACCESS_KEY_ID (for local development)
 * - APP_SECRET_ACCESS_KEY (for local development)
 * - APP_DYNAMODB_TABLE_NAME (submissions table name)
 * - APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE (GSI name)
 */

const { DynamoDBClient, UpdateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configuration
const config = {
  region: process.env.APP_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  ...(process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.APP_ACCESS_KEY_ID,
          secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
        },
      }
    : {}),
};

const dynamoClient = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const SUBMISSIONS_TABLE = process.env.APP_DYNAMODB_TABLE_NAME || 'health-screening-submissions';
const GSI_NAME = process.env.APP_DYNAMODB_SUBMISSIONS_GSI_CHURCH_DATE || 'submissions-church-date-index';

async function checkIfGSIExists() {
  try {
    console.log(`🔍 Checking if GSI "${GSI_NAME}" exists on table "${SUBMISSIONS_TABLE}"...`);

    const result = await dynamoClient.send(new DescribeTableCommand({
      TableName: SUBMISSIONS_TABLE,
    }));

    const existingGSI = result.Table.GlobalSecondaryIndexes?.find(
      gsi => gsi.IndexName === GSI_NAME
    );

    if (existingGSI) {
      console.log(`✅ GSI "${GSI_NAME}" already exists`);
      console.log(`   - ProjectionType: ${existingGSI.Projection.ProjectionType}`);
      console.log(`   - KeySchema: ${existingGSI.KeySchema.map(k => `${k.AttributeName}(${k.KeyType})`).join(', ')}`);
      return true;
    }

    console.log(`❌ GSI "${GSI_NAME}" does not exist`);
    return false;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error(`❌ Table "${SUBMISSIONS_TABLE}" does not exist`);
      console.log('💡 Please create the submissions table first');
      process.exit(1);
    }
    throw error;
  }
}

async function createGSI() {
  console.log(`🚀 Creating GSI "${GSI_NAME}" on table "${SUBMISSIONS_TABLE}"...`);

  const updateParams = {
    TableName: SUBMISSIONS_TABLE,
    AttributeDefinitions: [
      {
        AttributeName: 'churchId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'submissionDate',
        AttributeType: 'S',
      },
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: GSI_NAME,
          KeySchema: [
            {
              AttributeName: 'churchId',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'submissionDate',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      },
    ],
  };

  try {
    const result = await dynamoClient.send(new UpdateTableCommand(updateParams));
    console.log(`✅ GSI creation initiated successfully`);
    console.log(`   - TableStatus: ${result.TableDescription.TableStatus}`);
    console.log(`   - GSI Count: ${result.TableDescription.GlobalSecondaryIndexes?.length || 0}`);

    console.log('\n⏳ GSI creation is asynchronous. Status will be "CREATING" initially.');
    console.log('⏳ This may take several minutes to complete.');
    console.log('⏳ You can check the status using:');
    console.log(`   node scripts/setup-dynamodb-gsi.js --check`);

  } catch (error) {
    if (error.name === 'ValidationException') {
      console.error('❌ Validation Error:', error.message);
      console.log('💡 This might be because:');
      console.log('   - The GSI already exists (try --check)');
      console.log('   - Invalid attribute names or types');
      console.log('   - Table is in BACKING_UP or other incompatible state');
    } else {
      console.error('❌ Error creating GSI:', error.message);
    }
    process.exit(1);
  }
}

async function checkGSIStatus() {
  try {
    console.log(`🔍 Checking GSI "${GSI_NAME}" status on table "${SUBMISSIONS_TABLE}"...`);

    const result = await dynamoClient.send(new DescribeTableCommand({
      TableName: SUBMISSIONS_TABLE,
    }));

    const gsi = result.Table.GlobalSecondaryIndexes?.find(
      idx => idx.IndexName === GSI_NAME
    );

    if (!gsi) {
      console.log(`❌ GSI "${GSI_NAME}" not found`);
      return;
    }

    console.log(`📊 GSI Status: ${gsi.IndexStatus}`);
    console.log(`📊 Backfilling: ${gsi.Backfilling ? 'Yes' : 'No'}`);

    if (gsi.IndexStatus === 'ACTIVE') {
      console.log('✅ GSI is ready to use!');
      console.log(`📊 ItemCount: ${gsi.ItemCount || 0} items`);
    } else if (gsi.IndexStatus === 'CREATING') {
      console.log('⏳ GSI is still being created...');
      console.log('💡 This may take several minutes for large tables');
    } else {
      console.log(`⚠️  GSI Status: ${gsi.IndexStatus}`);
    }

  } catch (error) {
    console.error('❌ Error checking GSI status:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 DynamoDB GSI Setup Tool');
  console.log('==========================');
  console.log(`📍 Region: ${config.region}`);
  console.log(`📍 Table: ${SUBMISSIONS_TABLE}`);
  console.log(`📍 GSI: ${GSI_NAME}`);

  const args = process.argv.slice(2);
  const isCheckMode = args.includes('--check') || args.includes('-c');

  try {
    if (isCheckMode) {
      await checkGSIStatus();
    } else {
      const gsiExists = await checkIfGSIExists();

      if (!gsiExists) {
        await createGSI();
      }
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkIfGSIExists,
  createGSI,
  checkGSIStatus,
};
