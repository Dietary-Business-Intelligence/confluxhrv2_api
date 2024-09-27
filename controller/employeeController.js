import connection from '../dbconfig.js';

export const AddBasicERmpDet = async (req, res) => {
    const {
        staffid,
        company_id,
        first_name,
        last_name,
        em_email,
        status,
        em_birthday,
        em_gender,
        em_phone,
        job_type
    } = req.body;

    // Check if the staffid already exists
    let checkSql = `SELECT * FROM hrms_employee WHERE staffid = ?`;

    connection.query(checkSql, [staffid], (err, results) => {
        if (err) {
            console.error('Error checking staffid: ', err);
            return res.status(500).send('Error checking staffid');
        }

        if (results.length > 0) {
            // staffid exists, do not insert
            return res.status(409).send('This Employee already exists');
        } else {
            // Fetch the last em_id for the given company_id ordered by em_id descending
            let emIdSql = `SELECT em_id FROM hrms_employee WHERE company_id = ? ORDER BY staffid DESC`;

            connection.query(emIdSql, [company_id], (err, results) => {
                if (err) {
                    console.error('Error fetching last em_id: ', err);
                    return res.status(500).send('Error fetching last em_id');
                }

                let newEmId = 1; // Default if no previous em_id for the company

                if (results.length > 0 && results[0].em_id) {
                    newEmId = parseInt(results[0].em_id, 10) + 1;
                }


                // Insert the new employee with the generated em_id
                let insertSql = `INSERT INTO hrms_employee
                                   (staffid, company_id, em_id, em_code, first_name, last_name, em_email, status, em_birthday, em_gender, em_phone,job_type)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                connection.query(insertSql, [
                    staffid,
                    company_id,
                    newEmId,
                    newEmId,
                    first_name,
                    last_name,
                    em_email,
                    status,
                    em_birthday,
                    em_gender,
                    em_phone,
                    job_type
                ], (err, result) => {
                    if (err) {
                        console.error('Error inserting data: ', err);
                        return res.status(500).send('Error inserting data');
                    }

                    res.status(200).send('Employee added successfully with em_id: ' + newEmId);
                });
            });
        }
    });
}

// Route to fetch employee details by email
export const GetEmployeeDetails = async (req, res) => {
    const { em_email } = req.query;
    if (!em_email) {
        return res.status(400).json({ error: 'em_email query parameter is required' });
    }

    // SQL query to fetch employee details
    const query = `SELECT staffid, em_id, first_name, last_name, em_email FROM hrms_employee WHERE em_email = ? AND status = 'ACTIVE'`;

    connection.query(query, [em_email], (err, results) => {
        if (err) {
            console.error('Error fetching employee details:', err);
            return res.status(500).json({ error: 'Database query error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Send the employee details as a response
        res.status(200).json(results[0]);
    });
}