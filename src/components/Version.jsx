// ✅ 动态版本号组件（从 package.json 读取真实版本）
import { useEffect, useState } from 'react';

function Version() {
  const [version, setVersion] = useState('v2.0.7');
  
  useEffect(() => {
    // 从 package.json 读取真实版本
    fetch('/package.json')
      .then(res => res.json())
      .then(data => {
        if (data.version) {
          setVersion(`v${data.version}`);
        }
      })
      .catch(err => {
        console.warn('读取 package.json 失败，使用默认版本:', err);
      });
  }, []);
  
  return <span>{version}</span>;
}

export default Version;
