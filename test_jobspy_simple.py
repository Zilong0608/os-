"""
JobSpy 简单测试 - 快速验证是否能正常工作
"""

from jobspy import scrape_jobs

print("🔍 开始测试 JobSpy...")
print("搜索: Python Developer in Sydney, Australia")
print("-" * 50)

try:
    # 简单搜索
    jobs = scrape_jobs(
        site_name=["indeed"],        # 先只用 Indeed，最稳定
        search_term="python developer",
        location="Sydney, Australia",
        country_indeed='Australia',
        results_wanted=5,
        hours_old=168,               # 一周内
    )
    
    print(f"\n✅ 成功！找到 {len(jobs)} 个职位\n")
    
    # 显示结果
    if len(jobs) > 0:
        for idx, job in jobs.iterrows():
            print(f"{idx+1}. {job['title']}")
            print(f"   公司: {job['company']}")
            print(f"   地点: {job['location']}")
            print(f"   链接: {job['job_url']}")
            print()
        
        # 保存
        jobs.to_csv("test_jobs.csv", index=False, encoding='utf-8-sig')
        print("📁 已保存到 test_jobs.csv")
    else:
        print("⚠️ 没有找到职位")
        
except Exception as e:
    print(f"❌ 错误: {e}")
    print("\n可能的原因:")
    print("1. 网络连接问题")
    print("2. 需要先安装: pip install -U python-jobspy")
    print("3. JobSpy 被目标网站限流")

