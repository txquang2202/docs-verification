import { Controller, Post, Body } from '@nestjs/common';

// Configurable result weights (sum to 1)
const WEIGHTS = {
  verified: 0.5,
  rejected: 0.2,
  inconclusive: 0.3,
};

function weightedRandom(): 'verified' | 'rejected' | 'inconclusive' {
  const rand = Math.random();
  if (rand < WEIGHTS.verified) return 'verified';
  if (rand < WEIGHTS.verified + WEIGHTS.rejected) return 'rejected';
  return 'inconclusive';
}

function randomDelay(minMs = 1000, maxMs = 5000): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Controller('internal')
export class MockController {
  /**
   * Simulates the external document verification service.
   * Returns one of: verified | rejected | inconclusive
   * with a random delay of 1–5 seconds.
   *
   * This endpoint is internal-only. In production, protect it
   * or replace it with the real external service URL.
   */
  @Post('mock-verify')
  async verify(@Body() body: { documentId: string; fileName: string }) {
    await randomDelay(1000, 5000);

    const result = weightedRandom();
    const confidence =
      result === 'inconclusive' ? 0.45 : result === 'verified' ? 0.95 : 0.88;

    return {
      result,
      confidence,
      documentId: body.documentId,
      message: `Mock verification completed: ${result}`,
      processedAt: new Date().toISOString(),
    };
  }
}
