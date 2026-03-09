#!/usr/bin/env node
/**
 * 模块级同步 I/O 检测脚本
 * 
 * 用途：在 CI 或开发时自动检测路由模块中是否存在模块级同步 I/O
 * 使用：node scripts/check-sync-io.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, '../server/routes');

// 同步 I/O 方法列表
const SYNC_IO_METHODS = [
  'readFileSync',
  'writeFileSync',
  'mkdirSync',
  'existsSync',
  'statSync',
  'readdirSync',
  'unlinkSync',
  'rmdirSync',
  'renameSync',
  'copyFileSync',
  'appendFileSync',
  'readDirSync',
  'writeJsonSync',
  'readJsonSync'
];

// 允许的上下文（这些情况下的同步 I/O 是安全的）
const SAFE_CONTEXTS = [
  'function',      // 函数内部
  '=>',            // 箭头函数
  'router\\.',     // 路由处理函数中
  'app\\.',        // Express 应用中间件
  'if\\s*\\(',     // 条件语句（但需要在函数内）
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  
  let inFunction = false;
  let braceDepth = 0;
  let lastFunctionLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // 检测函数开始
    if (/\bfunction\b/.test(line) || /=>\s*\{/.test(line) || /async\s+function/.test(line)) {
      inFunction = true;
      lastFunctionLine = lineNum;
      braceDepth++;
    }
    
    // 检测路由处理函数开始
    if (/router\.(get|post|put|delete|use)\s*\(/.test(line)) {
      inFunction = true;
      lastFunctionLine = lineNum;
    }
    
    // 简单的括号计数（不完美，但足够检测大多数情况）
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    
    if (braceDepth <= 0 && lineNum > lastFunctionLine + 1) {
      inFunction = false;
    }
    
    // 检查同步 I/O 调用
    for (const method of SYNC_IO_METHODS) {
      const pattern = new RegExp(`\\bfs\\.${method}\\s*\\(`);
      if (pattern.test(line)) {
        // 检查是否在安全上下文中
        const isSafe = SAFE_CONTEXTS.some(ctx => new RegExp(ctx).test(line));
        
        // 如果是模块顶层（不在函数内），报告问题
        if (!isSafe && !inFunction) {
          issues.push({
            line: lineNum,
            method: method,
            content: line.trim()
          });
        }
      }
    }
  }
  
  return issues;
}

function main() {
  console.log('🔍 检查模块级同步 I/O...\n');
  
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(ROUTES_DIR, f));
  
  let totalIssues = 0;
  
  for (const file of files) {
    const issues = checkFile(file);
    const filename = path.basename(file);
    
    if (issues.length > 0) {
      console.log(`❌ ${filename}`);
      for (const issue of issues) {
        console.log(`   第 ${issue.line} 行：fs.${issue.method}()`);
        console.log(`   ${issue.content}`);
      }
      console.log();
      totalIssues += issues.length;
    } else {
      console.log(`✅ ${filename}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (totalIssues > 0) {
    console.log(`❌ 发现 ${totalIssues} 个问题`);
    console.log('\n请修复这些问题，将同步 I/O 封装到函数内部。');
    console.log('参考：CONTRIBUTING.md - 禁止模块级同步 I/O\n');
    process.exit(1);
  } else {
    console.log('✅ 所有文件都符合规范！\n');
    process.exit(0);
  }
}

main();
