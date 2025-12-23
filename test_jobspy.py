"""
JobSpy 测试脚本
测试从 LinkedIn 和 Indeed 爬取职位信息
"""

from jobspy import scrape_jobs
import pandas as pd
from datetime import datetime

def test_basic_search():
    """基础测试：搜索澳洲的 Python 开发职位"""
    print("\n" + "="*60)
    print("🔍 测试 1: 基础搜索 - Python Developer (澳洲)")
    print("="*60)
    
    try:
        jobs = scrape_jobs(
            site_name=["indeed", "linkedin"],  # 从这两个网站爬取
            search_term="python developer",
            location="Sydney, Australia",
            country_indeed='Australia',
            results_wanted=5,  # 每个网站5个，总共约10个
            hours_old=168,     # 最近一周
            verbose=1,         # 显示日志
        )
        
        print(f"\n✅ 成功！找到 {len(jobs)} 个职位")
        
        if len(jobs) > 0:
            print("\n前5个职位预览：")
            print(jobs[['site', 'title', 'company', 'location']].head())
            
            # 保存结果
            filename = f"test_results_basic_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            jobs.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"\n📁 已保存到: {filename}")
            
            return jobs
        else:
            print("⚠️ 没有找到职位")
            return None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return None


def test_linkedin_detailed():
    """测试 2: LinkedIn 详细信息（包含完整描述）"""
    print("\n" + "="*60)
    print("🔍 测试 2: LinkedIn 详细信息 - Software Engineer")
    print("="*60)
    print("⚠️ 注意：获取详细信息会比较慢...")
    
    try:
        jobs = scrape_jobs(
            site_name=["linkedin"],
            search_term="software engineer",
            location="Melbourne, Australia",
            results_wanted=3,  # 只要3个，因为会比较慢
            linkedin_fetch_description=True,  # 获取完整描述
            hours_old=72,      # 最近3天
            verbose=1,
        )
        
        print(f"\n✅ 成功！找到 {len(jobs)} 个职位")
        
        if len(jobs) > 0:
            print("\n职位详情：")
            for idx, job in jobs.iterrows():
                print(f"\n{idx+1}. {job['title']} @ {job['company']}")
                print(f"   📍 {job['location']}")
                print(f"   🔗 {job['job_url']}")
                if job['description']:
                    desc = str(job['description'])[:200]  # 只显示前200个字符
                    print(f"   📝 描述: {desc}...")
            
            # 保存结果
            filename = f"test_results_linkedin_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            jobs.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"\n📁 已保存到: {filename}")
            
            return jobs
        else:
            print("⚠️ 没有找到职位")
            return None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        print("💡 提示: LinkedIn 可能有速率限制，如果失败可以等几分钟再试")
        return None


def test_remote_jobs():
    """测试 3: 搜索远程工作"""
    print("\n" + "="*60)
    print("🔍 测试 3: 远程工作 - Full Stack Developer")
    print("="*60)
    
    try:
        jobs = scrape_jobs(
            site_name=["indeed"],  # Indeed 对远程支持较好
            search_term="full stack developer",
            location="Australia",
            country_indeed='Australia',
            is_remote=True,     # 只要远程工作
            job_type="fulltime",  # 全职
            results_wanted=5,
            verbose=1,
        )
        
        print(f"\n✅ 成功！找到 {len(jobs)} 个远程职位")
        
        if len(jobs) > 0:
            print("\n远程职位列表：")
            print(jobs[['title', 'company', 'location', 'is_remote']].head())
            
            # 保存结果
            filename = f"test_results_remote_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            jobs.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"\n📁 已保存到: {filename}")
            
            return jobs
        else:
            print("⚠️ 没有找到远程职位")
            return None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return None


def test_multiple_sites():
    """测试 4: 从多个网站同时爬取"""
    print("\n" + "="*60)
    print("🔍 测试 4: 多网站爬取 - Data Analyst")
    print("="*60)
    
    try:
        jobs = scrape_jobs(
            site_name=["indeed", "linkedin", "glassdoor"],  # 三个网站
            search_term="data analyst",
            location="Brisbane, Australia",
            country_indeed='Australia',
            results_wanted=3,  # 每个网站3个
            hours_old=168,
            verbose=1,
        )
        
        print(f"\n✅ 成功！找到 {len(jobs)} 个职位")
        
        if len(jobs) > 0:
            # 按网站分组统计
            print("\n按网站统计：")
            site_counts = jobs['site'].value_counts()
            for site, count in site_counts.items():
                print(f"  📊 {site}: {count} 个职位")
            
            print("\n职位列表：")
            print(jobs[['site', 'title', 'company', 'location']].head(10))
            
            # 保存结果
            filename = f"test_results_multi_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            jobs.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"\n📁 已保存到: {filename}")
            
            return jobs
        else:
            print("⚠️ 没有找到职位")
            return None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return None


def main():
    """运行所有测试"""
    print("\n" + "🚀"*30)
    print("   JobSpy 测试脚本")
    print("🚀"*30)
    print("\n⏰ 开始时间:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    # 运行测试
    results = []
    
    # 测试 1: 基础搜索
    result1 = test_basic_search()
    if result1 is not None:
        results.append(("基础搜索", len(result1)))
    
    # 测试 2: LinkedIn 详细信息（可选，因为比较慢）
    print("\n是否运行 LinkedIn 详细测试？(会比较慢，按 Enter 跳过，输入 y 运行)")
    # 自动跳过，避免用户交互
    # result2 = test_linkedin_detailed()
    
    # 测试 3: 远程工作
    result3 = test_remote_jobs()
    if result3 is not None:
        results.append(("远程工作", len(result3)))
    
    # 测试 4: 多网站爬取
    result4 = test_multiple_sites()
    if result4 is not None:
        results.append(("多网站爬取", len(result4)))
    
    # 总结
    print("\n" + "="*60)
    print("📊 测试总结")
    print("="*60)
    for test_name, count in results:
        print(f"  ✅ {test_name}: {count} 个职位")
    
    print(f"\n⏰ 完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n💡 提示: 所有结果已保存为 CSV 文件，可以用 Excel 打开查看")
    print("\n" + "🎉"*30 + "\n")


if __name__ == "__main__":
    main()

