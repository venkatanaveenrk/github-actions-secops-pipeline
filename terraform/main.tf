# =============================================================================
#  Sample Terraform — Azure Resource Group + Storage Account
#  This file demonstrates Checkov IaC scanning in the DevSecOps pipeline.
#  Checkov will flag any misconfigurations automatically.
# =============================================================================

terraform {
  required_version = ">= 1.9.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.80"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
  default     = "devsecops-demo-rg"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "github-actions-secops-pipeline"
  }
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

# Storage Account — Checkov will scan this for misconfigs
# ✅ HTTPS only enforced
# ✅ TLS 1.2 minimum
# ✅ Public blob access disabled
# ✅ Shared key access can be disabled
resource "azurerm_storage_account" "main" {
  name                     = "devsecopsdemosa"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Security settings
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false

  blob_properties {
    delete_retention_policy {
      days = 7
    }
    versioning_enabled = true
  }

  tags = local.common_tags
}

# Key Vault — another resource Checkov scans
resource "azurerm_key_vault" "main" {
  name                       = "devsecops-demo-kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  rbac_authorization_enabled = true
  tags                       = local.common_tags

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }
}

data "azurerm_client_config" "current" {}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}
