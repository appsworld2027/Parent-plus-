import { expect, test } from '@playwright/test';
import { parentBackend } from './support/parentBackend';
import { login } from './support/backend';

test('website login exposes clickable Coach and Parent spaces without a typed URL', async ({page}) => {
  await parentBackend(page); await page.goto('/');
  await page.getByRole('link',{name:'Open Parent space',exact:true}).click();
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByText('YOUR FAMILY WORKSPACE',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Open Coach space',exact:true}).click();
  await expect(page.getByText('YOUR COACH WORKSPACE',{exact:true})).toBeVisible();
});

test('signed-in Coach opens Parent setup and returns to the dashboard with the same session', async ({page}) => {
  await parentBackend(page); await login(page);
  await page.getByRole('link',{name:'Open Parent space',exact:true}).click();
  await expect(page.getByLabel('Your parent name',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Open Coach space',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Good (morning|afternoon|evening)/})).toBeVisible();
});

test('space switching cannot silently discard an unsaved Coach form', async ({page}) => {
  await parentBackend(page); await login(page);
  await page.getByRole('button',{name:'Create a batch',exact:true}).click();
  await page.getByLabel('Batch name',{exact:true}).fill('Unsent batch');
  const link=page.getByRole('link',{name:'Open Parent space',exact:true});
  await expect(link).toHaveAttribute('aria-disabled','true');
  await expect(link).not.toHaveAttribute('href');
  await expect(page.getByLabel('Batch name',{exact:true})).toHaveValue('Unsent batch');
});
