#!/usr/bin/env python3
"""
Backend API Testing for Weekly Demand Management System
Tests all CRUD operations, filtering, and business logic
"""

import requests
import sys
import json
from datetime import datetime
from typing import List, Optional

# Use the public backend URL from frontend .env
BACKEND_URL = "https://kanban-vendas.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class DemandAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.created_demand_ids = []
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            return self.log_test(
                "API Health Check", 
                success,
                f"- Status: {response.status_code}, Response: {data}"
            )
        except Exception as e:
            return self.log_test("API Health Check", False, f"- Error: {str(e)}")

    def test_create_demand(self, description: str, priority: str, responsible: str, subgroup: str, category: str = "this_week"):
        """Test demand creation"""
        payload = {
            "description": description,
            "priority": priority,
            "responsible": responsible,
            "subgroup": subgroup,
            "category": category
        }
        
        try:
            response = requests.post(f"{API_BASE}/demands", json=payload, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Validate response structure
                required_fields = ['id', 'description', 'priority', 'responsible', 'subgroup', 'category', 'created_at', 'updated_at']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    return self.log_test(
                        f"Create Demand ({description[:20]}...)", 
                        False, 
                        f"- Missing fields: {missing_fields}"
                    )
                
                # Validate ID format
                if not data['id'].startswith('DMD-'):
                    return self.log_test(
                        f"Create Demand ({description[:20]}...)", 
                        False, 
                        f"- Invalid ID format: {data['id']}"
                    )
                
                self.created_demand_ids.append(data['id'])
                return self.log_test(
                    f"Create Demand ({description[:20]}...)", 
                    True, 
                    f"- ID: {data['id']}, Category: {data['category']}"
                )
            else:
                return self.log_test(
                    f"Create Demand ({description[:20]}...)", 
                    False, 
                    f"- Status: {response.status_code}, Response: {response.text}"
                )
                
        except Exception as e:
            return self.log_test(f"Create Demand ({description[:20]}...)", False, f"- Error: {str(e)}")

    def test_get_all_demands(self):
        """Test getting all demands"""
        try:
            response = requests.get(f"{API_BASE}/demands", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                demands_count = len(data) if isinstance(data, list) else 0
                return self.log_test(
                    "Get All Demands", 
                    True, 
                    f"- Found {demands_count} demands"
                )
            else:
                return self.log_test(
                    "Get All Demands", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test("Get All Demands", False, f"- Error: {str(e)}")

    def test_get_demand_by_id(self, demand_id: str):
        """Test getting specific demand"""
        try:
            response = requests.get(f"{API_BASE}/demands/{demand_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                return self.log_test(
                    f"Get Demand by ID ({demand_id})", 
                    True, 
                    f"- Description: {data.get('description', 'N/A')[:30]}..."
                )
            else:
                return self.log_test(
                    f"Get Demand by ID ({demand_id})", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Get Demand by ID ({demand_id})", False, f"- Error: {str(e)}")

    def test_update_demand_category(self, demand_id: str, new_category: str):
        """Test updating demand category (for drag-drop)"""
        payload = {"category": new_category}
        
        try:
            response = requests.put(f"{API_BASE}/demands/{demand_id}", json=payload, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                actual_category = data.get('category')
                category_match = actual_category == new_category
                
                return self.log_test(
                    f"Update Category ({demand_id} → {new_category})", 
                    category_match, 
                    f"- Expected: {new_category}, Got: {actual_category}"
                )
            else:
                return self.log_test(
                    f"Update Category ({demand_id} → {new_category})", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Update Category ({demand_id} → {new_category})", False, f"- Error: {str(e)}")

    def test_filter_by_priority(self, priority: str):
        """Test filtering demands by priority"""
        try:
            response = requests.get(f"{API_BASE}/demands?priority={priority}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Check if all returned demands have the correct priority
                all_correct_priority = all(d.get('priority') == priority for d in data)
                
                return self.log_test(
                    f"Filter by Priority ({priority})", 
                    all_correct_priority, 
                    f"- Found {len(data)} demands with priority {priority}"
                )
            else:
                return self.log_test(
                    f"Filter by Priority ({priority})", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Filter by Priority ({priority})", False, f"- Error: {str(e)}")

    def test_filter_by_subgroup(self, subgroup: str):
        """Test filtering demands by subgroup"""
        try:
            response = requests.get(f"{API_BASE}/demands?subgroup={subgroup}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                all_correct_subgroup = all(d.get('subgroup') == subgroup for d in data)
                
                return self.log_test(
                    f"Filter by Subgroup ({subgroup})", 
                    all_correct_subgroup, 
                    f"- Found {len(data)} demands in subgroup {subgroup}"
                )
            else:
                return self.log_test(
                    f"Filter by Subgroup ({subgroup})", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Filter by Subgroup ({subgroup})", False, f"- Error: {str(e)}")

    def test_delete_single_demand(self, demand_id: str):
        """Test deleting a single demand"""
        try:
            response = requests.delete(f"{API_BASE}/demands/{demand_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                # Verify demand is actually deleted
                verify_response = requests.get(f"{API_BASE}/demands/{demand_id}", timeout=10)
                is_deleted = verify_response.status_code == 404
                
                return self.log_test(
                    f"Delete Single Demand ({demand_id})", 
                    is_deleted, 
                    f"- Deleted successfully, verification status: {verify_response.status_code}"
                )
            else:
                return self.log_test(
                    f"Delete Single Demand ({demand_id})", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Delete Single Demand ({demand_id})", False, f"- Error: {str(e)}")

    def test_bulk_delete_demands(self, demand_ids: List[str]):
        """Test bulk delete functionality"""
        payload = {"ids": demand_ids}
        
        try:
            response = requests.post(f"{API_BASE}/demands/bulk-delete", json=payload, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Verify demands are actually deleted
                remaining_demands = []
                for demand_id in demand_ids:
                    verify_response = requests.get(f"{API_BASE}/demands/{demand_id}", timeout=10)
                    if verify_response.status_code != 404:
                        remaining_demands.append(demand_id)
                
                all_deleted = len(remaining_demands) == 0
                
                return self.log_test(
                    f"Bulk Delete ({len(demand_ids)} demands)", 
                    all_deleted, 
                    f"- Expected deleted: {len(demand_ids)}, Actually deleted: {len(demand_ids) - len(remaining_demands)}"
                )
            else:
                return self.log_test(
                    f"Bulk Delete ({len(demand_ids)} demands)", 
                    False, 
                    f"- Status: {response.status_code}"
                )
                
        except Exception as e:
            return self.log_test(f"Bulk Delete ({len(demand_ids)} demands)", False, f"- Error: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Weekly Demand Management API Tests")
        print(f"📡 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test API health
        if not self.test_api_health():
            print("🛑 API health check failed. Cannot proceed with other tests.")
            return False
        
        # Test demand creation with different data
        test_demands = [
            {
                "description": "Implementar novo dashboard de vendas",
                "priority": "alta",
                "responsible": "João Silva",
                "subgroup": "BI Analytics",
                "category": "this_week"
            },
            {
                "description": "Corrigir bug no sistema de agendamento",
                "priority": "media",
                "responsible": "Maria Santos",
                "subgroup": "Help Desk",
                "category": "stalled"
            },
            {
                "description": "Análise de territórios Q4",
                "priority": "baixa",
                "responsible": "Pedro Costa",
                "subgroup": "Gestão de territórios",
                "category": "last_week"
            }
        ]
        
        for demand_data in test_demands:
            self.test_create_demand(**demand_data)
        
        # Test getting all demands
        self.test_get_all_demands()
        
        # Test getting specific demands
        for demand_id in self.created_demand_ids[:2]:  # Test first 2
            self.test_get_demand_by_id(demand_id)
        
        # Test updating demand categories (for drag-drop functionality)
        if len(self.created_demand_ids) >= 2:
            self.test_update_demand_category(self.created_demand_ids[0], "stalled")
            self.test_update_demand_category(self.created_demand_ids[1], "last_week")
        
        # Test filtering functionality
        self.test_filter_by_priority("alta")
        self.test_filter_by_priority("media")
        self.test_filter_by_subgroup("BI Analytics")
        self.test_filter_by_subgroup("Help Desk")
        
        # Test deletion functionality
        if len(self.created_demand_ids) >= 3:
            # Test single delete
            self.test_delete_single_demand(self.created_demand_ids[-1])  # Delete last created
            
            # Test bulk delete with remaining demands
            if len(self.created_demand_ids) >= 2:
                self.test_bulk_delete_demands(self.created_demand_ids[:2])
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = DemandAPITester()
    success = tester.run_comprehensive_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())