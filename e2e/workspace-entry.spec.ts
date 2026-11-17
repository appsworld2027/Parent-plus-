import { expect, test } from '@playwright/test';
import { parentBackend } from './support/parentBackend';
import { login } from './support/backend';

test('website offers role-specific signup and returning-user login', async ({page}) => {
  await parentBackend(page); await page.goto('/');
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Sign up as a Parent',exact:true}).click();
  await expect(page).toHaveURL(/\/parent\/signup$/);
  await expect(page.getByText('YOUR FAMILY WORKSPACE',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Confirm password',{exact:true})).toBeVisible();
  await expect(page.getByText('Create your account, verify your email, then set up your family.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back to sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Sign up as a Coach',exact:true}).click();
  await expect(page).toHaveURL(/\/coach\/signup$/);
  await expect(page.getByText('YOUR COACH WORKSPACE',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Confirm password',{exact:true})).toBeVisible();
  await expect(page.getByText('Create your owner account. Verify your email before setting up your academy.',{exact:true})).toBeVisible();
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
