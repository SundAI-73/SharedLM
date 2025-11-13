# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions for Continuous Integration and Continuous Deployment. The pipeline ensures that all code changes are tested, validated, and deployed only when all checks pass.

## Workflow Flow

### Development → nwl → main → Production

1. **Developer Branch** (e.g., `gagan`)
   - Developer builds and tests locally
   - Push changes to their branch

2. **PR to nwl**
   - Create PR from any branch (e.g., `gagan`) to `nwl`
   - CI runs automatically: Backend Check + Frontend Check + Tests
   - **Only after all checks pass** → Can merge PR to `nwl`

3. **PR to main**
   - Create PR from `nwl` to `main`
   - **NO CI runs** (code already tested in nwl)
   - **Manual review and merge** to `main`

4. **Production Deployment**
   - After merge to `main` → Code is pushed to `main` branch
   - Push to `main` automatically triggers:
     - **Vercel**: Auto-deploys frontend
     - **Render**: Auto-deploys backend

## Workflow Structure

### Combined CI Check (`.github/workflows/ci-complete.yml`)
**Main workflow for PRs to nwl**

- **Triggers**: 
  - PRs to `nwl` (from any branch like `gagan`)
  - Only runs when relevant files change (`apps/**`, `test/**`, `package.json`)
  
- **Note**: PRs to `main` from `nwl` are manually merged after testing in `nwl` branch
  
- **Purpose**: Ensures all checks pass before allowing merge

- **Jobs** (run in parallel):
  1. `backend-check`: Backend validation & build
     - Install dependencies
     - Check for conflicts
     - Verify imports
     - Check database models
     - Build backend
  
  2. `frontend-check`: Frontend validation & build
     - Install dependencies
     - Build frontend
     - Verify build output
  
  3. `test-suite`: Test execution
     - Install dependencies
     - Run all tests
     - Generate coverage
  
  4. `all-checks-passed`: Final gate
     - Only passes if all three above jobs pass
     - **Required for PR merge**

### Deployment

- **Triggers**: Automatic on push to `main` branch
- **Handled by**:
  - **Vercel**: Auto-deploys frontend on push to `main` (via Vercel integration)
  - **Render**: Auto-deploys backend on push to `main` (via Render integration)
- **No GitHub workflow needed** - Vercel and Render handle deployment directly

### Other Workflows
- `backend-ci.yml`, `frontend-ci.yml`, `test-ci.yml`: Kept for reference, only run via `workflow_dispatch`

## Branch Protection Rules

### Required Checks for `nwl` Branch
Before merging any branch to `nwl`, the following must pass:
1. ✅ Backend Check
2. ✅ Frontend Check  
3. ✅ Test Suite
4. ✅ All Checks Passed

### PRs to `main` Branch
- **No CI required** - Code is already tested in `nwl` branch
- **Manual review and merge** only
- After merge to `main`, Vercel and Render auto-deploy

## Running Tests Locally

Before pushing, always test locally:

```bash
# Test everything
npm run check:all

# Just tests
npm test
npm run test:local

# Specific test file
npm run test:auth

# With coverage
npm run test:coverage
```

## Development Workflow

### Step-by-Step:

1. **Create/Update Feature Branch**
   ```bash
   git checkout -b gagan  # or your branch name
   ```

2. **Make Changes & Test Locally**
   ```bash
   npm run check:all  # Verify everything works
   ```

3. **Push to Your Branch**
   ```bash
   git push origin gagan
   ```

4. **Create PR to nwl**
   - GitHub UI: Create PR from `gagan` → `nwl`
   - CI automatically runs (Backend + Frontend + Tests)
   - Wait for all checks to pass ✅

5. **Merge to nwl**
   - Once all checks pass → Merge PR to `nwl`
   - Code is now tested and ready

6. **Create PR to main**
   - GitHub UI: Create PR from `nwl` → `main`
   - No CI runs (already tested in nwl)
   - Manual review

7. **Manually Merge to main**
   - After review → Manually merge PR to `main`

8. **Auto-Deploy**
   - Push to `main` triggers:
     - Vercel deployment (frontend)
     - Render deployment (backend)

## Important Notes

- ✅ **Always test locally** before pushing
- ✅ **All PRs to nwl must pass CI** before merging
- ✅ **PRs to main are manual** (code already tested in nwl)
- ✅ **Only pushes to main** trigger deployments (Vercel + Render)
- ✅ **Workflows only run** when relevant files change (`apps/**`, `test/**`)
- ⚠️ **Configure branch protection**: Mark "All Checks Passed" as required in GitHub settings

## Testing Strategy

### Unit Tests
- Test individual functions and utilities
- Mark with `@pytest.mark.unit`

### Integration Tests
- Test API endpoints
- Test service integrations
- Mark with `@pytest.mark.integration` or `@pytest.mark.api`

### Test Coverage
- Minimum coverage threshold: 0% (configurable)
- Coverage reports generated in `test/coverage_html/`
- Coverage uploaded to Codecov in CI

## Environment Variables for CI

### Test Environment
- `ENCRYPTION_KEY`: Test encryption key (stored as secret)
- `DATABASE_URL`: `sqlite:///:memory:` (in-memory database)
- `ENVIRONMENT`: `test`

### Frontend Build
- `REACT_APP_API_URL`: Backend API URL (stored as secret)

## Troubleshooting

### Tests Fail in CI
1. Run tests locally: `npm run test:ci`
2. Check environment variables match CI settings
3. Ensure all dependencies are in `requirements.txt`

### Build Fails in CI
1. Run build locally: `npm run check:frontend`
2. Check for missing environment variables
3. Verify Node.js version matches CI (v18)

### Deployment Not Triggering
1. Verify push is directly to `main` branch
2. Check Vercel/Render settings for auto-deploy
3. Ensure deployment workflow ran successfully

## Best Practices

1. **Always run tests locally** before pushing
2. **Never skip CI checks** - they ensure code quality
3. **Keep test coverage high** - add tests for new features
4. **Use descriptive commit messages** - helps with debugging
5. **Test in `nwl` first** - before merging to `main`

## Support

For issues with CI/CD:
1. Check workflow logs in GitHub Actions
2. Verify environment variables are set correctly
3. Ensure all required secrets are configured in GitHub repository settings

