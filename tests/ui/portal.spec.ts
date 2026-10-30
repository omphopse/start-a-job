import {test,expect} from '@playwright/test';
test('home loads without horizontal overflow',async({page},testInfo)=>{await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`screenshots/home-${testInfo.project.name}.png`,fullPage:true});});
