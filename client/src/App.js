// src/App.js
import React, { useCallback, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import Dropzone from 'react-dropzone';
import styled from 'styled-components';
import axios from 'axios';



const AppContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
`;

const Header = styled.h1`
  font-size: 3rem;
  margin-bottom: 20px;
  color: #333;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
`;


const Subtitle = styled.p`
  font-size: 1.2rem;
  margin-bottom: 30px;
  color: #554;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
`;

const DropzoneWrapper = styled.div`
  width: 100%;
  margin-bottom: 20px;
  border: 3px dashed #3498db;
  border-radius: 10px;
  padding: 30px;
  cursor: pointer;
  transition: border 0.3s ease;

  &:hover {
    border-color: #2980b9;
  }

  p {
    margin: 0;
    color: #555;
  }
`;

const ResultContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const ResultImage = styled.div`
  margin-bottom: 20px;

  img {
    max-width: 50%;
    height: auto;
    border-radius: 5px;
  }
`;

const ResultText = styled.div`
  width: 100%;
  white-space: pre-wrap;
  font-size: 1.3rem;
  background-color: #fff;
  border: 2px solid #3498db;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 20px;

  h2 {
    color: #3498db;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }

  ul {
    list-style-type: none;
    padding: 0;

    li {
      margin-bottom: 10px;
    }

    strong {
      color: #333;
    }
  }

  input {
    width: calc(100% - 20px);
    padding: 10px;
    margin-top: 10px;
    margin-bottom: 20px;
    border: 1px solid #3498db;
    border-radius: 5px;
    box-sizing: border-box;
    color: #555;

    &:focus {
      outline: none;
      border-color: #2980b9;
      box-shadow: 0 0 8px rgba(52, 152, 219, 0.5);
    }
  }

  button {
    background-color: #3498db;
    color: #fff;
    padding: 12px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #2980b9;
    }

    & + button {
      margin-left: 10px;
    }
  }
`;

const ErrorText = styled.p`
  color: red;
`;
function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [textResult, setTextResult] = useState("");
  const [error, setError] = useState(null);
  const [ocrHistory, setOcrHistory] = useState([]);
  const [filterName, setFilterName] = useState("");
  const [filterIdentificationNo, setFilterIdentificationNo] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [extractedFields, setExtractedFields] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [filtersActive, setFiltersActive] = useState(false);




  const handleImageDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    setError(null);

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB.');
        return;
      }

      setSelectedImage(file);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const { data: { text } } = await Tesseract.recognize(reader.result, 'eng');
          const extractedData = parseOCRResults(text);
          setExtractedFields(extractedData);
          setTextResult(JSON.stringify(extractedData, null, 2));

          // Send data to the server and get the returned ID
          const response = await sendExtractedDataToServer(extractedData);

          localStorage.setItem('ocrRecordId', response.data.id);

          // Set the returned ID in the state
          setSelectedRecordId(response.data.id);
        } catch (error) {
          console.error('Error:', error);
          setError('Error processing image.');
        }
      };

      reader.readAsDataURL(file);
    }
  }, []);

  // Use useEffect to log the value of selectedRecordId after it's updated
  useEffect(() => {
    console.log(selectedRecordId);
  }, [selectedRecordId]);

  const sendExtractedDataToServer = async (data) => {
    try {
      const response = await axios.post('http://localhost:5000/api/ocr', data);
      console.log('Server response:', response.data);
      return response;
    } catch (error) {
      console.error('Error sending data to the server:', error);
      return null;
    }
  };

  const parseOCRResults = (ocrText) => {
    const Identification_Number = ocrText.match(/(\d{1,2}\s?\d{4,5}\s?\d{5}\s?\d{2}\s?\d)/);
    const name = ocrText.match(/Miss\s(\w+)/);
    const Last_name = ocrText.match(/Last name\s(\w+)/);
    const date_of_birth = ocrText.match(/Date of Birth\s(\d{2}\s\w+\.\s\d{4})/);
    const date_of_issue = ocrText.match(/Date of Issue\s(\d{2}\/\d{2}\/\d{4})/);
    const date_of_expiry = ocrText.match(/Date of Expiry\s(\d{4}-\d{2}-\d{2})/);

    return {
     
      Identification_Number: Identification_Number ? Identification_Number[1] : "",
      name: name ? name[1] : "",
      Last_name: Last_name ? Last_name[1] : "",
      date_of_birth: date_of_birth ? date_of_birth[1] : "",
      date_of_issue: date_of_issue ? date_of_issue[1] : "",
      date_of_expiry: date_of_expiry ? (date_of_expiry[1]) : "",
    };
  };

  const fetchOcrHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/ocr', {
        params: { name: filterName, identificationNo: filterIdentificationNo },
      });
      setOcrHistory(response.data);
    } catch (error) {
      console.error('Error fetching OCR history:', error);
    }
  };

  const deleteOcrRecord = async () => {
    try {
      const id = localStorage.getItem('ocrRecordId');
      await axios.delete(`http://localhost:5000/api/ocr/${id}`);
      fetchOcrHistory();
    } catch (error) {
      console.error('Error deleting OCR record:', error);
    }
  };

  const handleFilterChange = () => {
    fetchOcrHistory();
    setFiltersActive(true);

  };

  const handleEdit = (recordId) => {
    setSelectedRecordId(recordId);
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      // Check if selectedRecordId is not null before making the save request
      const id = localStorage.getItem('ocrRecordId');
      if (id !== null) {
        // Check if a similar record already exists in the backend
        const existingRecordResponse = await axios.get(`http://localhost:5000/api/ocr/${id}`);
        const existingRecord = existingRecordResponse.data;

        if (existingRecord) {
          // Update the existing record
          await axios.put(`http://localhost:5000/api/ocr/${id}`, {
            // Update with the appropriate fields based on your form/input
            Identification_Number: extractedFields.Identification_Number,
            name: extractedFields.name,
            Last_name: extractedFields.Last_name,
            date_of_birth: extractedFields.date_of_birth,
            date_of_issue: extractedFields.date_of_issue,
            date_of_expiry: extractedFields.date_of_expiry,
          });
        } else {
          // Handle the case where the existing record is not found
          console.error('Existing record not found for editing');
        }

        // Refetch OCR history to update the frontend
        fetchOcrHistory();
        setEditMode(false);
        setSelectedRecordId(null); // Reset the selectedRecordId after saving
      } else {
        console.warn('selectedRecordId is null. Save request skipped.');
      }
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };


  return (
    <AppContainer>
      <Header>ImText</Header>
      <Subtitle>Get words in the image!</Subtitle>

      <ContentContainer>
        <Dropzone onDrop={handleImageDrop} accept="image/*" maxFiles={1} maxSize={2 * 1024 * 1024}>
          {({ getRootProps, getInputProps, isDragActive, isDragReject }) => (
            <DropzoneWrapper
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''}`}
            >
              <input {...getInputProps()} />
              <p>Drag & drop an image here, or click to select one.</p>
              {isDragReject && <ErrorText>File type not supported</ErrorText>}
              {error && <ErrorText>{error}</ErrorText>}
            </DropzoneWrapper>
          )}
        </Dropzone>

        <ResultContainer>
          {selectedImage && (
            <ResultImage>
              <img src={URL.createObjectURL(selectedImage)} alt="thumb" />
            </ResultImage>
          )}
          {textResult && (
            <ResultText>
              {/* <p>{textResult}</p> */}
              <div>
                <h2>Extracted Fields</h2>
                <ul>
                  {Object.entries(extractedFields).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value}
                    </li>
                  ))}
                </ul>
              </div>
              {editMode ? (
                <div>
                  {Object.entries(extractedFields).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setExtractedFields({ ...extractedFields, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                  <button onClick={handleSave}>Save</button>
                </div>
              ) : (
                <div>
                  <button onClick={() => handleEdit(selectedRecordId)}>Edit</button>
                  <button onClick={() => deleteOcrRecord()}>Delete</button>
                </div>
              )}
            </ResultText>
          )}
        </ResultContainer>
      </ContentContainer>

      <div>
        <label>Filter by Name:</label>
        <input type="text" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
      </div>

      <div>
        <label>Filter by Identification Number:</label>
        <input type="text" value={filterIdentificationNo} onChange={(e) => setFilterIdentificationNo(e.target.value)} />
      </div>

      <button onClick={handleFilterChange}>Apply Filters</button>

      {filtersActive && (
        <div>
          <h2>OCR History</h2>
          <ul>
            {ocrHistory.map((item) => (
              <li key={item._id}>
                {/* Display relevant fields */}
                <span>Name: {item.name},</span>
                <span>Last Name: {item.Last_name},</span>
                <span>Identification Number: {item.Identification_Number}</span>
                {/* Add other fields as needed */}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppContainer>
  );
}

export default App;
