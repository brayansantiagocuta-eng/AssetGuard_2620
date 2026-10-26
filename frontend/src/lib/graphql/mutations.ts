import { gql } from "@apollo/client";

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      role
      fullName
      email
      status
      createdAt
    }
  }
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      role
      fullName
      email
      status
      updatedAt
    }
  }
`;

export const RESET_USER_PASSWORD_MUTATION = gql`
  mutation ResetUserPassword($id: ID!, $newPassword: String!) {
    resetUserPassword(id: $id, newPassword: $newPassword) {
      id
      role
      fullName
      email
      status
      updatedAt
    }
  }
`;

export const CREATE_ASSET_MUTATION = gql`
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
      id
      serialNumber
      qrCode
      model
      estimatedValue
      acquisitionDate
      status
      createdAt
    }
  }
`;

export const UPDATE_ASSET_STATUS_MUTATION = gql`
  mutation UpdateAssetStatus($id: ID!, $status: AssetStatus!, $notes: String) {
    updateAssetStatus(id: $id, status: $status, notes: $notes) {
      id
      serialNumber
      status
      updatedAt
    }
  }
`;

export const BULK_UPLOAD_ASSETS_MUTATION = gql`
  mutation BulkUploadAssets($assets: [BulkAssetRowInput!]!) {
    bulkUploadAssets(assets: $assets) {
      success
      totalProcessed
      insertedCount
      errorMessage
      failedRowNumber
    }
  }
`;

export const BULK_UPLOAD_ASSETS_FILE_MUTATION = gql`
  mutation BulkUploadAssetsFile($fileName: String!, $base64Content: String!) {
    bulkUploadAssetsFile(fileName: $fileName, base64Content: $base64Content) {
      success
      totalProcessed
      insertedCount
      errorMessage
      failedRowNumber
    }
  }
`;

export const REGISTER_CALIBRATION_MUTATION = gql`
  mutation RegisterCalibration($assetId: ID!, $result: CalibrationResult!, $notes: String) {
    registerCalibration(assetId: $assetId, result: $result, notes: $notes) {
      id
      status
      usageCycles
      lastCalibrationDate
    }
  }
`;

export const CREATE_LOAN_REQUEST_MUTATION = gql`
  mutation CreateLoanRequest($input: CreateLoanRequestInput!) {
    createLoanRequest(input: $input) {
      id
      status
      requestDate
      requiredDate
      expectedReturnDate
      motive
    }
  }
`;

export const APPROVE_LOAN_REQUEST_MUTATION = gql`
  mutation ApproveLoanRequest($id: ID!) {
    approveLoanRequest(id: $id) {
      id
      status
      asset {
        id
        status
      }
    }
  }
`;

export const REJECT_LOAN_REQUEST_MUTATION = gql`
  mutation RejectLoanRequest($id: ID!, $reason: String) {
    rejectLoanRequest(id: $id, reason: $reason) {
      id
      status
    }
  }
`;

export const GENERATE_LOAN_OTP_MUTATION = gql`
  mutation GenerateLoanOtp($loanRequestId: ID!) {
    generateLoanOtp(loanRequestId: $loanRequestId) {
      id
      expiresAt
      attemptsRemaining
      used
      pin
    }
  }
`;

export const VALIDATE_LOAN_OTP_MUTATION = gql`
  mutation ValidateLoanOTP($loanRequestId: ID!, $pin: String!) {
    validateLoanOTP(loanRequestId: $loanRequestId, pin: $pin) {
      id
      deliveryDate
      status
      asset {
        id
        status
      }
    }
  }
`;

export const RETURN_LOAN_MUTATION = gql`
  mutation ReturnLoan($loanId: ID!, $damaged: Boolean!, $notes: String) {
    returnLoan(loanId: $loanId, damaged: $damaged, notes: $notes) {
      id
      actualReturnDate
      status
      asset {
        id
        status
      }
    }
  }
`;

export const RUN_DAILY_OVERDUE_JOB_MUTATION = gql`
  mutation RunDailyOverdueJob {
    runDailyOverdueJob
  }
`;
