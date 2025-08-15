#!/usr/bin/env node

/**
 * Script to check Tomorrow.io API rate limit status
 * Run with: node scripts/check-rate-limit.js
 */

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function checkRateLimit() {
  try {
    console.log('🔍 Checking Tomorrow.io API rate limit status...\n');
    
    const response = await axios.get(`${BASE_URL}/api/weather/rate-limit`);
    const data = response.data;
    
    if (data.success) {
      const { remainingRequests, resetTime, canProceed } = data.data;
      
      console.log('📊 Rate Limit Status:');
      console.log(`   ✅ Can proceed: ${canProceed ? 'Yes' : 'No'}`);
      console.log(`   📈 Remaining requests: ${remainingRequests}`);
      
      if (resetTime) {
        const resetDate = new Date(resetTime);
        const now = new Date();
        const timeUntilReset = Math.ceil((resetTime - now.getTime()) / 1000 / 60);
        
        console.log(`   ⏰ Reset time: ${resetDate.toLocaleString()}`);
        console.log(`   ⏳ Time until reset: ${timeUntilReset} minutes`);
      }
      
      console.log('\n💡 Tips:');
      if (remainingRequests < 10) {
        console.log('   ⚠️  Low on requests! Consider reducing API calls.');
      } else if (remainingRequests < 20) {
        console.log('   ⚡ Moderate usage. Monitor your request count.');
      } else {
        console.log('   ✅ Good request count remaining.');
      }
      
      if (!canProceed) {
        console.log('   🚫 Rate limit exceeded. Wait for reset before making more requests.');
      }
      
    } else {
      console.log('❌ Failed to get rate limit info:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error checking rate limit:', error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Make sure your backend server is running and the endpoint exists.');
    }
  }
}

async function testWeatherRequest() {
  try {
    console.log('\n🌤️  Testing weather request...');
    
    const response = await axios.get(`${BASE_URL}/api/weather/current/Tel%20Aviv,%20Israel`);
    
    if (response.data.success) {
      console.log('✅ Weather request successful!');
      console.log(`   📍 Location: ${response.data.data.location}`);
      console.log(`   🌡️  Temperature: ${response.data.data.temperature}°C`);
      
      if (response.data.rateLimit) {
        console.log(`   📊 Remaining requests: ${response.data.rateLimit.remainingRequests}`);
      }
    } else {
      console.log('❌ Weather request failed:', response.data.error);
    }
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('🚫 Rate limit exceeded!');
      console.log(`   Message: ${error.response.data.message}`);
      console.log(`   Retry after: ${error.response.data.retryAfter} seconds`);
    } else {
      console.error('❌ Error testing weather request:', error.message);
    }
  }
}

// Main execution
async function main() {
  await checkRateLimit();
  await testWeatherRequest();
  
  console.log('\n✨ Rate limit check complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkRateLimit, testWeatherRequest };
