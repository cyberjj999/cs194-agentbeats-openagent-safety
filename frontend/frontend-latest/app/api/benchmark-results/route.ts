import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the benchmark results file
    const benchmarkPath = path.join(process.cwd(), '../../scenarios/openagentsafety/evaluation/benchmark_results.json');
    
    // Check if file exists
    if (!fs.existsSync(benchmarkPath)) {
      return NextResponse.json({ error: 'Benchmark results not found' }, { status: 404 });
    }
    
    // Read the benchmark results
    const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
    
    return NextResponse.json(benchmarkData);
  } catch (error) {
    console.error('Error loading benchmark results:', error);
    return NextResponse.json({ error: 'Failed to load benchmark results' }, { status: 500 });
  }
}
