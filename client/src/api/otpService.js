// OTP Service for MyOperator Integration
import ClientSessionManager from '@/lib/clientSession';

const MYOPERATOR_API_URL = 'https://publicapi.myoperator.co/chat/messages';
const MYOPERATOR_TOKEN = 'bQBVcdNzGPIThEhPCRtKqISb0c7OrQnE5kVmvfqrfl';
const MYOPERATOR_COMPANY_ID = '685ef0684b5ee840';
const PHONE_NUMBER_ID = '697547396774899';

// Generate a random reference ID
const generateMyopRefId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP via MyOperator
export const sendOTP = async (phoneNumber, countryCode = '91') => {
  try {
    console.log('Sending OTP to:', { phoneNumber, countryCode });
    
    const otp = generateOTP();
    const myopRefId = generateMyopRefId();
    
    const payload = {
      phone_number_id: PHONE_NUMBER_ID,
      myop_ref_id: myopRefId,
      customer_country_code: countryCode,
      customer_number: phoneNumber,
      data: {
        type: "template",
        context: {
          template_name: "opt",
          body: {
            otp: otp
          },
          buttons: [
            {
              otp: otp,
              index: 0
            }
          ]
        }
      }
    };

    console.log('MyOperator payload:', { ...payload, data: { ...payload.data, context: { ...payload.data.context, body: { otp: '[HIDDEN]' } } } });

    const response = await fetch('/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        countryCode,
        otp,
        myopRefId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to send OTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('OTP sent successfully:', { myopRefId, phoneNumber });
    
    return {
      success: true,
      myopRefId,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// Verify OTP
export const verifyOTP = async (phoneNumber, otp, myopRefId) => {
  try {
    console.log('Verifying OTP:', { phoneNumber, otp, myopRefId });
    
    const response = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        otp,
        myopRefId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to verify OTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('OTP verified successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};

// Check if phone number exists
export const checkPhoneExists = async (phoneNumber) => {
  try {
    const response = await fetch(`/api/otp/check-phone?phoneNumber=${phoneNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to check phone: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking phone:', error);
    throw new Error(`Failed to check phone: ${error.message}`);
  }
};

// Update customer profile after OTP verification
export const updateCustomerProfile = async (profileData) => {
  try {
    const session = ClientSessionManager.getCurrentSession();
    if (!session || !session.client_id) {
      throw new Error('No active session found');
    }

    const response = await fetch('/api/otp/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: session.client_id,
        ...profileData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update profile: ${response.status}`);
    }

    const result = await response.json();
    console.log('Profile updated successfully:', result);
    
    return result;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}; 