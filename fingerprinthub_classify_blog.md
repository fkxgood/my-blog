# 给 Nuclei 模板做自动分类 —— 一个编辑距离算法的进化历程

> 作者：fkxgreat  
> 日期：2025-07-10  

## 1. 背景

众所周知，指纹识别与漏扫是常见的递进式漏洞扫描策略。因此，结合 **FingerprintHub** 与 **nuclei** 的递进式自动化扫描是一种经典方案。为了实现自动化指纹识别、POC 选择和漏扫，我计划将 **Nuclei** 模板与 **FingerprintHub** 中的产品进行一一对应并自动归类。

由于 **Nuclei** 模板数量庞大且命名方式不统一，简单的“关键词匹配”方法无法有效处理这些差异，特别是考虑到同一产品可能以不同大小写、版本号、分隔符，甚至缩写形式出现。为了解决这一问题，我转而考虑使用 **字符串相似度算法** 来提升匹配的准确性与效率。

---

## 2. 尝试过的几条“弯路”

| 方案 | 思路 | 问题 |
| ---- | ---- | ---- |
| **Jaccard / Cosine** | 把名字拆词后做集合/向量比较 | 对中文、厂商缩写效果一般；排版差异导致相似度奇低 |
| **N-gram + 余弦** | 按窗口拆字，再做余弦 | 对短字符串（常见 3〜15 字符）噪声太大 |
| **正则 & 手工规则** | 针对常见前缀/后缀写规则 | 规则爆炸、维护地狱 |

这些方案或多或少能提高命中率，但想写“一劳永逸”的脚本基本不现实。最后我还是回到了 **编辑距离（Levenshtein）** —— 它天然可以衡量两个短串的最小变更成本。

---

## 3. 初版：自己写 Levenshtein，跑起来“很优雅”，就是慢

第一版我直接手撸了一个经典的动态规划实现，封装在：

```18:40:classify_poc_by_fingerprint_distance.py
import re

def clean_name(name):
    """清理产品名称，去除特殊字符"""
    name = re.sub(r'[^\w\s\-]', '', name)
    return name.strip()

def levenshtein_distance(s1, s2):
    """计算编辑距离"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions  = current_row[j]    + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]
```

在 1.2万条模板 × 2.2万条指纹的全量比对上，这段代码 **单进程跑了 2 个多小时**，CPU 风扇呼呼转。

---

## 4. 提速①：内置 `difflib.SequenceMatcher`

后来我发现 Python 自带了 C 扩展的 `difflib` 模块，里面的 `SequenceMatcher` 对短串相似度相当友好，于是重构了脚本，核心只剩一行：

```130:150:fingerprinthub_classify.py
    def calculate_similarity(self, text1, text2):
        """计算两个文本的相似度"""
        if not text1 or not text2:
            return 0
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
```

单进程时间压到 **30 分钟**，但依旧不够快。

---

## 5. 提速②：引入第三方库 `python-Levenshtein` + 多进程

`python-Levenshtein` 完全用 C 写，单次计算的开销只有纯 Python 的 20% 左右。  
同时，我用 `multiprocessing.Pool` 把指纹表切块并行，8C CPU 上直接把运行时间打到 **5分 30 秒** 左右，完全满足日常批量任务。

```python
from Levenshtein import ratio
from multiprocessing import Pool

def worker(chunk):
    # chunk 里装的是若干 (template, fingerprint) 对
    return [(t, f, ratio(t, f)) for t, f in chunk]

if __name__ == "__main__":
    with Pool() as p:
        for result in p.imap_unordered(worker, split_chunks(data)):
            save(result)
```

---

## 6. 现行版本（`fingerprinthub_classify.py`）概览

- **读取指纹库**：遍历 FingerprintHub 目录，聚合产品名称及关键词  
- **解析模板**：提取 `name / description / tags / metadata` 四元组  
- **相似度计算**：`SequenceMatcher` 进行文本比对  
- **打分策略**：  
  1. 完全命中加 10 分  
  2. 关键词 / 标签匹配加 2-5 分  
  3. 文件路径包含产品名加 2 分  
- **阈值过滤**：得分不到 3 认为“未知”，避免误归类  
- **结果落盘**：输出 `fingerprinthub_classification.json` 并按产品名复制模板到独立目录
- ```python
  #!/usr/bin/env python3
  # -*- coding: utf-8 -*-
  """
  基于FingerprintHub指纹库的Nuclei模板智能归类脚本
  将Nuclei模板按FingerprintHub的产品分类进行归类，实现一一对应
  """
  
  import os
  import json
  import yaml
  import re
  from pathlib import Path
  from collections import defaultdict
  from difflib import SequenceMatcher
  
  class FingerprintHubClassifier:
      def __init__(self, fingerprinthub_dir="FingerprintHub"):
          self.fingerprinthub_dir = Path(fingerprinthub_dir)
          self.product_names = set()
          self.product_keywords = defaultdict(list)
          self.load_fingerprinthub_products()
          
      def load_fingerprinthub_products(self):
          """加载FingerprintHub的所有产品名和关键词"""
          print("正在加载FingerprintHub产品库...")
          
          # 1. 从web-fingerprint目录加载
          web_fp_dir = self.fingerprinthub_dir / "web-fingerprint"
          if web_fp_dir.exists():
              for product_dir in web_fp_dir.iterdir():
                  if product_dir.is_dir():
                      product_name = product_dir.name
                      self.product_names.add(product_name)
                      # 加载该产品的所有指纹文件
                      for fp_file in product_dir.rglob("*.yaml"):
                          self.load_fingerprint_keywords(fp_file, product_name)
          
          # 2. 从service-fingerprint目录加载
          service_fp_dir = self.fingerprinthub_dir / "service-fingerprint"
          if service_fp_dir.exists():
              for product_dir in service_fp_dir.iterdir():
                  if product_dir.is_dir():
                      product_name = product_dir.name
                      self.product_names.add(product_name)
                      # 加载该产品的所有指纹文件
                      for fp_file in product_dir.rglob("*.yaml"):
                          self.load_fingerprint_keywords(fp_file, product_name)
          
          # 3. 从plugins目录加载
          plugins_dir = self.fingerprinthub_dir / "plugins"
          if plugins_dir.exists():
              for product_dir in plugins_dir.iterdir():
                  if product_dir.is_dir():
                      product_name = product_dir.name
                      self.product_names.add(product_name)
                      # 加载该产品的所有指纹文件
                      for fp_file in product_dir.rglob("*.yaml"):
                          self.load_fingerprint_keywords(fp_file, product_name)
          
          print(f"已加载 {len(self.product_names)} 个产品，{sum(len(keywords) for keywords in self.product_keywords.values())} 个关键词")
      
      def load_fingerprint_keywords(self, fp_file, product_name):
          """从指纹文件中提取关键词"""
          try:
              with open(fp_file, 'r', encoding='utf-8') as f:
                  data = yaml.safe_load(f)
                  if not data:
                      return
                  
                  # 提取关键词
                  keywords = []
                  
                  # 从info.name提取
                  if 'info' in data and 'name' in data['info']:
                      keywords.append(data['info']['name'].lower())
                  
                  # 从metadata.product提取
                  if 'metadata' in data and 'product' in data['metadata']:
                      keywords.append(data['metadata']['product'].lower())
                  
                  # 从tags提取
                  if 'info' in data and 'tags' in data['info']:
                      tags = data['info']['tags']
                      if isinstance(tags, list):
                          keywords.extend([tag.lower() for tag in tags if tag.lower() not in ['detect', 'tech', 'service', 'web']])
                  
                  # 从http matchers提取
                  if 'http' in data:
                      for http_item in data['http']:
                          if 'matchers' in http_item:
                              for matcher in http_item['matchers']:
                                  if 'words' in matcher:
                                      for word in matcher['words']:
                                          # 提取产品相关的关键词
                                          if isinstance(word, str) and len(word) > 3:
                                              # 过滤掉HTML标签、通用词汇等
                                              clean_word = re.sub(r'[<>"/\s]', '', word)
                                              if clean_word and len(clean_word) > 2:
                                                  keywords.append(clean_word.lower())
                  
                  # 添加到产品关键词库
                  for keyword in keywords:
                      if keyword and keyword not in self.product_keywords[product_name]:
                          self.product_keywords[product_name].append(keyword)
                          
          except Exception as e:
              print(f"加载指纹文件 {fp_file} 时出错: {e}")
      
      def extract_nuclei_info(self, yaml_file):
          """从Nuclei模板中提取关键信息"""
          try:
              with open(yaml_file, 'r', encoding='utf-8') as f:
                  data = yaml.safe_load(f)
                  if not data:
                      return {}
                  
                  info = {
                      'path': str(yaml_file),
                      'id': data.get('id', ''),
                      'name': '',
                      'description': '',
                      'tags': [],
                      'product': '',
                      'vendor': '',
                      'reference': []
                  }
                  
                  # 提取info字段
                  if 'info' in data:
                      info_data = data['info']
                      info['name'] = info_data.get('name', '')
                      info['description'] = info_data.get('description', '')
                      info['tags'] = info_data.get('tags', [])
                      info['reference'] = info_data.get('reference', [])
                  
                  # 提取metadata字段
                  if 'metadata' in data:
                      metadata = data['metadata']
                      info['product'] = metadata.get('product', '')
                      info['vendor'] = metadata.get('vendor', '')
                  
                  return info
                  
          except Exception as e:
              print(f"解析Nuclei模板 {yaml_file} 时出错: {e}")
              return {}
      
      def calculate_similarity(self, text1, text2):
          """计算两个文本的相似度"""
          if not text1 or not text2:
              return 0
          return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
      
      def find_best_match(self, nuclei_info):
          """为Nuclei模板找到最匹配的FingerprintHub产品"""
          best_match = None
          best_score = 0
          
          # 构建搜索文本
          search_text = f"{nuclei_info['name']} {nuclei_info['description']} {' '.join(nuclei_info['tags'])} {nuclei_info['product']}"
          search_text = search_text.lower()
          
          # 如果metadata中有明确的product，优先使用
          if nuclei_info['product']:
              for product_name in self.product_names:
                  if nuclei_info['product'].lower() == product_name.lower():
                      return product_name
          
          # 遍历所有产品，计算相似度
          for product_name, keywords in self.product_keywords.items():
              score = 0
              
              # 1. 直接名称匹配
              if nuclei_info['name'].lower() == product_name.lower():
                  score += 10
              elif product_name.lower() in nuclei_info['name'].lower():
                  score += 8
              elif nuclei_info['name'].lower() in product_name.lower():
                  score += 6
              
              # 2. 关键词匹配
              for keyword in keywords:
                  if keyword in search_text:
                      score += 3
                  elif self.calculate_similarity(keyword, search_text) > 0.8:
                      score += 2
              
              # 3. 标签匹配
              for tag in nuclei_info['tags']:
                  if tag.lower() == product_name.lower():
                      score += 5
                  elif product_name.lower() in tag.lower():
                      score += 3
              
              # 4. 描述匹配
              if product_name.lower() in nuclei_info['description'].lower():
                  score += 4
              
              # 5. 路径匹配
              if product_name.lower() in str(nuclei_info['path']).lower():
                  score += 2
              
              if score > best_score:
                  best_score = score
                  best_match = product_name
          
          # 设置阈值，避免错误匹配
          if best_score >= 3:
              return best_match
          else:
              return "unknown"
      
      def classify_templates(self, templates_dir="."):
          """分类所有Nuclei模板"""
          templates_dir = Path(templates_dir)
          yaml_files = list(templates_dir.rglob("*.yaml"))
          
          print(f"开始分类 {len(yaml_files)} 个Nuclei模板...")
          
          results = {}
          product_stats = defaultdict(int)
          
          for idx, yaml_file in enumerate(yaml_files, 1):
              # 跳过FingerprintHub目录
              if "FingerprintHub" in str(yaml_file):
                  continue
                  
              nuclei_info = self.extract_nuclei_info(yaml_file)
              if nuclei_info:
                  product = self.find_best_match(nuclei_info)
                  results[str(yaml_file)] = {
                      'product': product,
                      'name': nuclei_info['name'],
                      'description': nuclei_info['description'],
                      'tags': nuclei_info['tags']
                  }
                  product_stats[product] += 1
                  
                  if idx % 100 == 0:
                      print(f"已处理 {idx}/{len(yaml_files)} 个模板")
          
          return results, product_stats
      
      def create_product_directories(self, results, output_dir="products_fingerprinthub"):
          """按产品创建目录结构"""
          output_path = Path(output_dir)
          output_path.mkdir(exist_ok=True)
          
          product_files = defaultdict(list)
          for template_path, info in results.items():
              product = info['product']
              product_files[product].append(template_path)
          
          for product, files in product_files.items():
              product_dir = output_path / product
              product_dir.mkdir(exist_ok=True)
              
              # 复制模板文件
              for template_path in files:
                  src = Path(template_path)
                  if src.exists():
                      dst = product_dir / src.name
                      if not dst.exists():
                          try:
                              with open(src, 'r', encoding='utf-8') as fin:
                                  content = fin.read()
                              with open(dst, 'w', encoding='utf-8') as fout:
                                  fout.write(content)
                          except Exception as e:
                              print(f"复制 {src} 到 {dst} 出错: {e}")
              
              # 创建产品信息文件
              product_info = {
                  'product_name': product,
                  'template_count': len(files),
                  'templates': [
                      {
                          'path': f,
                          'name': results[f]['name'],
                          'description': results[f]['description'],
                          'tags': results[f]['tags']
                      }
                      for f in files
                  ]
              }
              
              with open(product_dir / 'product_info.json', 'w', encoding='utf-8') as f:
                  json.dump(product_info, f, indent=2, ensure_ascii=False)
  
  def main():
      classifier = FingerprintHubClassifier()
      
      # 分类模板
      results, product_stats = classifier.classify_templates()
      
      # 保存结果
      with open('fingerprinthub_classification.json', 'w', encoding='utf-8') as f:
          json.dump({
              'summary': {
                  'total_templates': len(results),
                  'total_products': len(product_stats)
              },
              'products': dict(product_stats),
              'classifications': results
          }, f, indent=2, ensure_ascii=False)
      
      # 创建产品目录
      classifier.create_product_directories(results)
      
      # 打印统计信息
      print(f"\n分类完成！")
      print(f"总模板数: {len(results)}")
      print(f"总产品数: {len(product_stats)}")
      print(f"\n前20个产品:")
      print("-" * 60)
      print(f"{'排名':<4} {'产品名':<30} {'模板数':<8}")
      print("-" * 60)
      
      sorted_products = sorted(product_stats.items(), key=lambda x: x[1], reverse=True)
      for i, (product, count) in enumerate(sorted_products[:20], 1):
          print(f"{i:<4} {product:<30} {count:<8}")
      
      print(f"\n结果已保存到:")
      print(f"- 分类报告: fingerprinthub_classification.json")
      print(f"- 产品目录: products_fingerprinthub/")
  
  if __name__ == "__main__":
      main() 
  ```

  

---

## 7. 小结 & 展望

1. **算法选择**  
   - 关键词、N-gram、正则可作为“预过滤”  
   - **编辑距离** 在处理「同义、错拼、版本号」时表现最好，是最终筛选的利器  
2. **性能优化**  
   - 自实现 Levenshtein 适合教学，生产环境一定要 **用 C 扩展**  
   - 多进程 / 多线程 / Cython / Rust 都是可行的加速手段  
3. **可维护性**  
   - 把阈值、权重写进配置文件，便于后续微调  
   - 结合 CI，把新增模板自动归类并输出差异报告  
