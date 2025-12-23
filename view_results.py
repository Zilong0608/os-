import pandas as pd

# 读取测试结果
df = pd.read_csv('test_results_basic_20251223_234045.csv')

print("=" * 70)
print("📊 JobSpy 测试结果详情")
print("=" * 70)

print(f"\n✅ 总职位数: {len(df)}")
print(f"📍 来源网站: {', '.join(df['site'].unique())}")
print(f"🏠 远程职位: {df['is_remote'].sum()} 个")

print("\n" + "=" * 70)
print("📋 职位列表")
print("=" * 70 + "\n")

for i, row in df.iterrows():
    print(f"{i+1}. {row['title']}")
    print(f"   🏢 公司: {row['company']}")
    print(f"   📍 地点: {row['location']}")
    print(f"   📅 发布: {row['date_posted']}")
    print(f"   💼 类型: {row['job_type']}")
    print(f"   🔗 链接: {row['job_url']}")
    
    # 显示描述的前150个字符
    if pd.notna(row['description']):
        desc = str(row['description'])[:150].replace('\n', ' ')
        print(f"   📝 描述: {desc}...")
    
    print()

print("=" * 70)
print("💾 数据包含的所有字段：")
print("=" * 70)
print(df.columns.tolist())

