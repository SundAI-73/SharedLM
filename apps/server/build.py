"""Build verification script - checks all imports and reports detailed errors"""
import sys
import traceback

def verify_build():
    """Verify all critical imports and report detailed errors"""
    print("=" * 70)
    print("🔍 BUILD VERIFICATION - Checking all imports...")
    print("=" * 70)
    print()
    
    # Test each import separately to pinpoint failures
    imports_to_test = [
        ("app", "app", "Main FastAPI application"),
        ("database.models", None, "Database models"),
        ("database.crud", None, "Database CRUD operations"),
        ("utils.encryption", None, "Encryption utilities"),
        ("utils.security", None, "Security utilities"),
        ("utils.cache", None, "Cache utilities"),
        ("utils.prompt", None, "Prompt utilities"),
        ("services.llm_router", None, "LLM router service"),
        ("services.mem0_client", None, "Mem0 client service"),
    ]
    
    failed_imports = []
    
    for module_name, attr_name, description in imports_to_test:
        try:
            print(f"  ✓ Checking {description}...", end=" ")
            module = __import__(module_name, fromlist=[attr_name] if attr_name else [])
            if attr_name:
                getattr(module, attr_name)
            print("OK")
        except ImportError as e:
            print("❌ FAILED")
            failed_imports.append((module_name, description, e, "ImportError"))
        except AttributeError as e:
            print("❌ FAILED")
            failed_imports.append((module_name, description, e, "AttributeError"))
        except Exception as e:
            print("❌ FAILED")
            failed_imports.append((module_name, description, e, type(e).__name__))
    
    print()
    
    if failed_imports:
        print("=" * 70)
        print("❌ BUILD FAILED - Import Errors Detected")
        print("=" * 70)
        print()
        
        for i, (module_name, description, error, error_type) in enumerate(failed_imports, 1):
            # Convert module name to file path
            file_path = f"apps/server/{module_name.replace('.', '/')}.py"
            
            print(f"Error #{i}: {description}")
            print(f"  📁 File Path: {file_path}")
            print(f"  📦 Module: {module_name}")
            print(f"  ⚠️  Error Type: {error_type}")
            print(f"  💬 Error Message: {error}")
            print()
            
            # Try to get traceback for more details with file paths
            try:
                tb_lines = traceback.format_exception(type(error), error, error.__traceback__)
                print("  📋 Traceback:")
                for line in tb_lines:
                    if line.strip():
                        # Highlight file paths in traceback
                        line_clean = line.strip()
                        if "File" in line_clean or file_path.replace("\\", "/") in line_clean or "apps/server" in line_clean:
                            print(f"    → {line_clean}")
                        else:
                            print(f"    {line_clean}")
            except:
                pass
            
            print()
        
        # Provide helpful suggestions with file structure
        print("=" * 70)
        print("🔧 TROUBLESHOOTING SUGGESTIONS:")
        print("=" * 70)
        print()
        
        for module_name, description, error, error_type in failed_imports:
            file_path = f"apps/server/{module_name.replace('.', '/')}.py"
            
            if "No module named" in str(error):
                missing_module = str(error).split("'")[1] if "'" in str(error) else "unknown"
                print(f"  • Missing module '{missing_module}':")
                print(f"    📁 Related File: {file_path}")
                print(f"    → Install: pip install {missing_module}")
                print(f"    → Check: apps/server/requirements.txt includes {missing_module}")
            elif "cannot import name" in str(error):
                missing_attr = str(error).split("'")[1] if "'" in str(error) else "unknown"
                print(f"  • Cannot import '{missing_attr}' from '{module_name}':")
                print(f"    📁 Check File: {file_path}")
                init_path = f"apps/server/{module_name.split('.')[0]}/__init__.py"
                print(f"    📁 Check Init: {init_path}")
                print(f"    → Verify: The attribute/class '{missing_attr}' exists in the file")
            else:
                print(f"  • Error in {module_name}:")
                print(f"    📁 File: {file_path}")
                print(f"    → Check: {file_path} for syntax errors")
                print(f"    → Verify: All dependencies are installed in .venv")
        
        print()
        print("=" * 70)
        print("Next Steps:")
        print("  1. Fix the errors listed above")
        print("  2. Run: pip install -r requirements.txt")
        print("  3. Run build again: Ctrl+Shift+B")
        print("=" * 70)
        print()
        return False
    
    # Final comprehensive test - try importing app
    try:
        print("Final verification: Importing main app module...", end=" ")
        from app import app
        print("OK")
        print()
    except Exception as e:
        print("❌ FAILED")
        print()
        print("=" * 70)
        print("❌ BUILD FAILED - Final App Import Failed")
        print("=" * 70)
        print()
        print(f"📁 File Path: apps/server/app.py")
        print(f"⚠️  Error: {e}")
        print()
        print("📋 Full Traceback:")
        traceback.print_exc()
        print()
        print("🔍 Check the file: apps/server/app.py")
        print("   Verify all imports and dependencies are correct")
        print("=" * 70)
        print()
        return False
    
    # Success!
    print("=" * 70)
    print("✅ BUILD SUCCESSFUL")
    print("=" * 70)
    print()
    print("All imports verified successfully:")
    print("  ✓ Main application (apps/server/app.py)")
    print("  ✓ Database models (apps/server/database/models.py)")
    print("  ✓ Database CRUD (apps/server/database/crud.py)")
    print("  ✓ Utility modules:")
    print("    • apps/server/utils/encryption.py")
    print("    • apps/server/utils/security.py")
    print("    • apps/server/utils/cache.py")
    print("    • apps/server/utils/prompt.py")
    print("  ✓ Service modules:")
    print("    • apps/server/services/llm_router.py")
    print("    • apps/server/services/mem0_client.py")
    print()
    print("You can now:")
    print("  • Run the server: python app.py")
    print("  • Run tests: pytest")
    print("  • Deploy the application")
    print("=" * 70)
    print()
    return True

if __name__ == "__main__":
    success = verify_build()
    sys.exit(0 if success else 1)

