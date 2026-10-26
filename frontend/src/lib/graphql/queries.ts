import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      role
      fullName
      email
      status
    }
  }
`;

export const GET_USERS_QUERY = gql`
  query GetUsers($pagination: PaginationInput, $role: Role, $status: UserStatus) {
    users(pagination: $pagination, role: $role, status: $status) {
      items {
        id
        role
        fullName
        email
        status
        createdAt
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_ASSETS_QUERY = gql`
  query GetAssets($pagination: PaginationInput, $status: AssetStatus, $categoryId: ID, $search: String) {
    assets(pagination: $pagination, status: $status, categoryId: $categoryId, search: $search) {
      items {
        id
        serialNumber
        qrCode
        model
        estimatedValue
        acquisitionDate
        status
        usageCycles
        maxUsageCycles
        lastCalibrationDate
        calibrationIntervalDays
        category {
          id
          name
        }
        location {
          id
          name
        }
        calibrationStatus {
          isCompliant
          daysUntilNextDue
          cyclesRemaining
          statusColor
          warningMessage
        }
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_ASSET_BY_SERIAL = gql`
  query GetAssetBySerial($serialNumber: String!) {
    assetBySerialNumber(serialNumber: $serialNumber) {
      id
      serialNumber
      qrCode
      model
      estimatedValue
      acquisitionDate
      status
      usageCycles
      maxUsageCycles
      lastCalibrationDate
      calibrationIntervalDays
      category {
        id
        name
      }
      location {
        id
        name
      }
      calibrationStatus {
        isCompliant
        daysUntilNextDue
        cyclesRemaining
        statusColor
        warningMessage
      }
    }
  }
`;

export const GET_LOAN_REQUESTS_QUERY = gql`
  query GetLoanRequests($pagination: PaginationInput, $status: LoanRequestStatus) {
    loanRequests(pagination: $pagination, status: $status) {
      items {
        id
        technician {
          id
          fullName
          email
        }
        asset {
          id
          serialNumber
          model
          status
          calibrationStatus {
            isCompliant
            statusColor
            warningMessage
          }
        }
        requestDate
        requiredDate
        expectedReturnDate
        motive
        status
        activeOtp {
          id
          expiresAt
          attemptsRemaining
          used
        }
        loan {
          id
          deliveryDate
          status
        }
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_MY_LOAN_HISTORY_QUERY = gql`
  query GetMyLoanHistory($pagination: PaginationInput, $status: LoanStatus) {
    myLoanHistory(pagination: $pagination, status: $status) {
      items {
        id
        deliveryDate
        actualReturnDate
        status
        notes
        asset {
          id
          serialNumber
          model
          estimatedValue
          status
        }
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_FINANCIAL_SUMMARY_QUERY = gql`
  query GetFinancialSummary {
    financialSummary {
      totalAssetsCount
      totalAcquisitionValue
      currentDepreciatedValue
      overdueAssetsCount
      totalValueAtRisk
      currency
    }
  }
`;

export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs($pagination: PaginationInput, $action: String, $entityName: String) {
    auditLogs(pagination: $pagination, action: $action, entityName: $entityName) {
      items {
        id
        userId
        userFullName
        action
        entityName
        entityId
        oldValue
        newValue
        ipAddress
        createdAt
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_JOB_EXECUTIONS_QUERY = gql`
  query GetJobExecutions($pagination: PaginationInput) {
    jobExecutions(pagination: $pagination) {
      items {
        id
        jobName
        executedAt
        status
        recordsProcessed
        details
      }
      pageInfo {
        currentPage
        pageSize
        totalElements
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_METADATA_QUERY = gql`
  query GetMetadata {
    categories {
      id
      name
      usefulLifeMonths
    }
    locations {
      id
      name
      type
    }
  }
`;
